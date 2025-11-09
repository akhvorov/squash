// Чистая бизнес-логика калькулятора (без DOM)

// Цены на человека
export const PRICES = {
    weekday: {
        peak: { slot: 9, pp: 12 },
        off_peak: { slot: 6, pp: 9 }
    },
    weekend: {
        peak: { slot: 6, pp: 9 },
        off_peak: { slot: 6, pp: 9 }
    }
};

export function getPriceForTime(startTime, dayType, duration) {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const startTimeMinutes = startHour * 60 + startMinute;
    const peakStart = 16 * 60 + 30;
    const peakEnd = 21 * 60;
    const gameDurationMinutes = duration * 60;
    const endTimeMinutes = startTimeMinutes + gameDurationMinutes;
    const isPeakTime = (startTimeMinutes < peakEnd && endTimeMinutes > peakStart);
    const priceCategory = isPeakTime ? 'peak' : 'off_peak';
    const dayPrices = PRICES[dayType];
    const prices = dayPrices[priceCategory];
    if (duration === 1.5) {
        return prices.pp;
    } else {
        return prices.slot;
    }
}

export function getSlotPrice(startTime, dayType, slotIndex) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const slotStartMinutes = hours * 60 + minutes + (slotIndex * 45);
    const slotStartHours = Math.floor(slotStartMinutes / 60);
    const slotStartMins = slotStartMinutes % 60;
    const slotTimeStr = slotStartHours.toString().padStart(2, '0') + ':' + 
                       slotStartMins.toString().padStart(2, '0');
    return getPriceForTime(slotTimeStr, dayType, 0.75);
}

export function getPPPrice(startTime, dayType) {
    return getPriceForTime(startTime, dayType, 1.5);
}

export function generateDistributions(players, courts) {
    const distributions = [];
    function generate(current, remaining, remainingCourts) {
        if (remainingCourts === 0) {
            if (remaining === 0) {
                distributions.push([...current]);
            }
            return;
        }
        if (remainingCourts === 1) {
            if (remaining >= 2) {
                distributions.push([...current, remaining]);
            }
            return;
        }
        const minForThisCourt = 2;
        const maxForThisCourt = remaining - (remainingCourts - 1) * 2;
        for (let i = minForThisCourt; i <= maxForThisCourt; i++) {
            generate([...current, i], remaining - i, remainingCourts - 1);
        }
    }
    generate([], players, courts);
    return distributions;
}

export function generatePlayerAssignments(distribution, players) {
    const assignments = [];
    const playerList = Array.from({length: players}, (_, i) => i + 1);
    function generate(currentAssignment, remainingPlayers, courtIndex) {
        if (courtIndex === distribution.length) {
            if (remainingPlayers.length === 0) {
                assignments.push(currentAssignment.map(arr => [...arr]));
            }
            return;
        }
        const playersNeeded = distribution[courtIndex];
        function generateCombinations(combo, remaining, needed) {
            if (needed === 0) {
                const newAssignment = [...currentAssignment, combo];
                const newRemaining = remainingPlayers.filter(p => !combo.includes(p));
                generate(newAssignment, newRemaining, courtIndex + 1);
                return;
            }
            if (remaining.length < needed) return;
            for (let i = 0; i <= remaining.length - needed; i++) {
                generateCombinations([...combo, remaining[i]], remaining.slice(i + 1), needed - 1);
            }
        }
        generateCombinations([], remainingPlayers, playersNeeded);
    }
    generate([], playerList, 0);
    return assignments;
}

export function generateBookingVariants(playerAssignment, players) {
    const variants = [];
    const allPlayers = Array.from({length: players}, (_, i) => i + 1);
    function generate(currentBookings, courtIndex) {
        if (courtIndex === playerAssignment.length) {
            variants.push([...currentBookings]);
            return;
        }
        for (const booker of allPlayers) {
            currentBookings.push(booker);
            generate(currentBookings, courtIndex + 1);
            currentBookings.pop();
        }
    }
    generate([], 0);
    return variants;
}

export function generateSubDistributionsForBookings(playerAssignment, bookings, subs, options) {
    const courts = playerAssignment.length;
    const playersWithSubs = new Set();
    for (let i = 1; i <= subs; i++) {
        playersWithSubs.add(i);
    }
    function generate(currentSubs, remainingSubs, courtIndex) {
        if (courtIndex === courts) {
            if (remainingSubs === 0) {
                options.push({
                    playerAssignment: playerAssignment.map(arr => [...arr]),
                    bookings: [...bookings],
                    subDistribution: [...currentSubs]
                });
            }
            return;
        }
        const playersOnCourt = playerAssignment[courtIndex];
        const maxSlots = 4;
        const playersWithSubsOnCourt = playersOnCourt.filter(p => playersWithSubs.has(p));
        const maxSubs = Math.min(remainingSubs, playersWithSubsOnCourt.length, maxSlots);
        const minSubs = 0;
        if (maxSubs < 0) {
            return;
        }
        for (let i = minSubs; i <= maxSubs; i++) {
            if (i > playersWithSubsOnCourt.length) {
                continue;
            }
            currentSubs.push(i);
            generate(currentSubs, remainingSubs - i, courtIndex + 1);
            currentSubs.pop();
        }
    }
    generate([], subs, 0);
}

export function generateBookingOptions(distribution, players, subs) {
    const options = [];
    const playerAssignments = generatePlayerAssignments(distribution, players);
    for (const assignment of playerAssignments) {
        const bookingVariants = generateBookingVariants(assignment, players);
        for (const bookings of bookingVariants) {
            generateSubDistributionsForBookings(assignment, bookings, subs, options);
        }
    }
    return options;
}

export function squashDistributionCost(courts, players, subs, startTime, dayType) {
    const distributions = generateDistributions(players, courts);
            let bestCost = Infinity;
            let bestDistribution = null;
            let bestPlan = null;
            let bestBookingCount = Infinity;
            let bestBookings = null;
            let bestPPCount = 0;
            let bestCourtsWithPPPriceAsPP = 0;
    
    for (const dist of distributions) {
        const bookingOptions = generateBookingOptions(dist, players, subs);
        for (const bookingOption of bookingOptions) {
            let totalCost = 0;
            let plan = [];
            let hasPP = false;
            let hasSlots = false;
            let ppCount = 0;
            
            for (let i = 0; i < bookingOption.playerAssignment.length; i++) {
                const playersOnCourt = bookingOption.playerAssignment[i];
                const playersCount = playersOnCourt.length;
                const subsOnCourt = bookingOption.subDistribution[i];
                const bookerIndex = bookingOption.bookings[i];
                
                if (playersCount === 2 && subsOnCourt === 0) {
                    hasPP = true;
                    ppCount++;
                    const ppCost = getPPPrice(startTime, dayType) * 2;
                    totalCost += ppCost;
                    plan.push({ 
                        type: 'pp', 
                        players: 2, 
                        subs: 0, 
                        cost: ppCost, 
                        booker: bookerIndex,
                        playersList: [...playersOnCourt],
                        courtIndex: i
                    });
                } else {
                    hasSlots = true;
                    const slot1Price = getSlotPrice(startTime, dayType, 0);
                    const slot2Price = getSlotPrice(startTime, dayType, 1);
                    const courtSlots = [slot1Price, slot1Price, slot2Price, slot2Price];
                    const playersWithSubs = new Set();
                    for (let i = 1; i <= subs; i++) {
                        playersWithSubs.add(i);
                    }
                    const playersWithSubsOnCourt = playersOnCourt.filter(p => playersWithSubs.has(p));
                    const maxSubsOnCourt = Math.min(playersWithSubsOnCourt.length, 4);
                    const slotsSorted = courtSlots.sort((a, b) => a - b);
                    const subsForCourt = Math.min(subsOnCourt, slotsSorted.length, maxSubsOnCourt);
                    const paidSlots = slotsSorted.slice(subsForCourt);
                    const courtCost = paidSlots.reduce((sum, cost) => sum + cost, 0);
                    totalCost += courtCost;
                    plan.push({ 
                        type: 'slots', 
                        players: playersCount, 
                        subs: subsForCourt, 
                        cost: courtCost,
                        booker: bookerIndex,
                        playersList: [...playersOnCourt],
                        courtIndex: i
                    });
                }
            }
            
            let bookingCount = 0;
            if (hasPP && hasSlots) {
                bookingCount = 2;
            } else if (hasPP || hasSlots) {
                bookingCount = 1;
            }
            
            // Подсчитываем количество кортов, которые стоят как PowerPlay и являются PowerPlay
            const ppPrice = getPPPrice(startTime, dayType) * 2;
            let courtsWithPPPriceAsPP = 0;
            for (const court of plan) {
                if (court.cost === ppPrice && court.type === 'pp') {
                    courtsWithPPPriceAsPP++;
                }
            }
            
            let bestCourtsWithPPPriceAsPP = 0;
            if (bestPlan) {
                for (const court of bestPlan) {
                    if (court.cost === ppPrice && court.type === 'pp') {
                        bestCourtsWithPPPriceAsPP++;
                    }
                }
            }
            
            let isBetter = false;
            if (totalCost < bestCost) {
                isBetter = true;
            } else if (totalCost === bestCost) {
                if (bookingCount < bestBookingCount) {
                    isBetter = true;
                } else if (bookingCount === bestBookingCount && ppCount > bestPPCount) {
                    isBetter = true;
                } else if (bookingCount === bestBookingCount && ppCount === bestPPCount && 
                          courtsWithPPPriceAsPP > bestCourtsWithPPPriceAsPP) {
                    // При равной стоимости, равном количестве броней и равном количестве PP кортов,
                    // предпочитаем вариант, где больше кортов стоят как PowerPlay и являются PowerPlay
                    isBetter = true;
                }
            }
            
            // Отладка: логируем варианты с кортом 2 как PowerPlay
            if (courts === 3 && players === 6 && subs === 3) {
                const court2 = plan.find(p => p.courtIndex === 1);
                if (court2 && court2.type === 'pp') {
                    console.log(`НАЙДЕН ВАРИАНТ С КОРТОМ 2 КАК PP: стоимость=${totalCost}, PP=${ppCount}, план=`, 
                        plan.map(p => `Корт${p.courtIndex+1}:${p.type}:${p.cost}€:subs=${p.subs}`).join(', '));
                }
            }
            
            if (isBetter) {
                bestCost = totalCost;
                bestDistribution = dist;
                bestPlan = plan;
                bestBookingCount = bookingCount;
                bestBookings = bookingOption.bookings;
                bestPPCount = ppCount;
                bestCourtsWithPPPriceAsPP = courtsWithPPPriceAsPP;
            }
        }
    }
    
    let costWithoutSubs = 0;
    if (players === 2 * courts) {
        costWithoutSubs = courts * getPPPrice(startTime, dayType) * 2;
    } else {
        const slot1Price = getSlotPrice(startTime, dayType, 0);
        const slot2Price = getSlotPrice(startTime, dayType, 1);
        const courtSlots = [slot1Price, slot1Price, slot2Price, slot2Price];
        const costPerCourt = courtSlots.reduce((sum, cost) => sum + cost, 0);
        costWithoutSubs = courts * costPerCourt;
    }
    
    return { 
        cost: bestCost, 
        plan: bestPlan, 
        costWithoutSubs: costWithoutSubs,
        distribution: bestDistribution,
        bookingCount: bestBookingCount,
        bookings: bestBookings
    };
}

