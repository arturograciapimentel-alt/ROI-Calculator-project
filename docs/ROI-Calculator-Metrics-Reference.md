# Duetto ROI Calculator — Metrics & Calculations Reference

This document describes every metric displayed in the ROI calculator, the inputs it depends on, and the exact formula used to derive it.

---

## 1. Input Parameters

All monetary inputs are collected in their native currency and converted to the selected output currency before any calculation runs.

| Input | Description | Notes |
|---|---|---|
| `totalRooms` | Total number of sellable rooms | — |
| `currentADR` | Current Average Daily Rate | In property currency |
| `currentOccupancy` | Current occupancy (0–1) | e.g. 0.72 = 72% |
| `yieldablePercent` | Fraction of room nights the RMS can optimize | Defaults to `1 − groupBusinessPercent` |
| `groupBusinessPercent` | Fraction of room nights sold as group blocks | Not optimized by open pricing |
| `hoursPerWeekManual` | Hours/week spent on manual pricing | Used for productivity metric only |
| `annualRMSystemsCost` | Annual cost of rate shoppers, pricing tools | In property currency |
| `annualConsultingCost` | Annual outsourced RM / consulting fees | In property currency |
| `subscriptionCost` | Annual Duetto subscription | In Duetto currency; 0 = auto-estimate |
| `implementationFee` | One-time go-live fee | In Duetto currency; Year 1 only |
| `ohipConnectivityFee` | Annual OHIP fee (Opera Cloud PMS only) | In Duetto currency |
| `initialContractYears` | Length of initial contract term (1–5) | Affects 5-year cost schedule |
| `revparUpliftPercent` | Scenario assumption: expected RevPAR uplift | Set per scenario (conservative / moderate / aggressive) |
| `marketGrowthRate` | Annual market growth assumption | Applied in Years 2–5 |

---

## 2. Currency Normalization

All monetary values are converted to the selected output currency before calculations run.

**Exchange rate convention:** `1 USD = N units` (e.g. MXN: 17.15 means 1 USD = 17.15 MXN).

```
outputValue = (inputValue / rate[inputCurrency]) × rate[outputCurrency]
```

- Performance metrics (ADR, RM costs) convert from `inputs.currency`
- Duetto investment fields convert from `inputs.duettoCurrency`
- Guard: if a rate is 0 or non-finite, it defaults to 1 (no conversion) to prevent divide-by-zero

---

## 3. Baseline Metrics

### Current RevPAR
```
currentRevPAR = currentADR × currentOccupancy
```

### Annual Available Room Nights
```
annualRooms = totalRooms × 365
```

---

## 4. RevPAR Uplift Model

The model applies a single `revparUpliftPercent` assumption to yieldable inventory, then decomposes it into ADR and occupancy components.

**ADR share of RevPAR uplift:** 60% (open pricing is primarily rate-driven)  
**Occupancy share:** 40% (demand intelligence)

### Yieldable-Segment New Metrics

```
yieldableNewRevPAR = currentRevPAR × (1 + revparUpliftPercent)

yieldableNewADR    = currentADR × (1 + revparUpliftPercent × 0.60)

yieldableNewOcc    = MIN(0.98, yieldableNewRevPAR / yieldableNewADR)
                   [falls back to currentOccupancy if yieldableNewADR = 0]
```

### Hotel-Wide Blended Metrics

The uplift on yieldable segments is scaled back to the full room inventory. Non-yieldable nights (group blocks, contracted) remain unchanged.

```
newRevPAR    = currentRevPAR + (yieldableNewRevPAR - currentRevPAR) × yieldablePercent

newADR       = currentADR    + (yieldableNewADR    - currentADR)    × yieldablePercent

newOccupancy = MIN(0.98, newRevPAR / newADR)
```

> **Why the displayed RevPAR improvement ≠ the scenario uplift input:**  
> The scenario uplift (e.g. 14%) applies only to yieldable inventory. Hotel-wide improvement = `uplift × yieldablePercent`. At 90% yieldable, a 14% input produces a 12.6% hotel-wide improvement.

---

## 5. Annual Revenue Impact

### Incremental ADR Revenue
Revenue gained from the rate increase on yieldable rooms at current occupancy levels.
```
incrementalADRRevenue = (yieldableNewADR - currentADR)
                      × currentOccupancy
                      × annualRooms
                      × yieldablePercent
```

### Incremental Occupancy Revenue
Revenue from additional room nights filled at the new higher ADR.
```
incrementalOccRevenue = yieldableNewADR
                      × (yieldableNewOcc - currentOccupancy)
                      × annualRooms
                      × yieldablePercent
```

### Combined RevPAR Uplift (primary revenue figure)
This is the single combined annual revenue gain used in all summaries.
```
combinedRevPARUplift = (yieldableNewRevPAR - currentRevPAR)
                     × annualRooms
                     × yieldablePercent

annualIncrementalRoomRevenue = combinedRevPARUplift
```

Note: `incrementalADRRevenue + incrementalOccRevenue ≈ combinedRevPARUplift` — minor differences arise because ADR and occupancy components are cross-effects of the same RevPAR uplift. The combined figure is definitive.

---

## 6. Cost Savings

### Systems Cost Savings
Direct replacement of existing RM tools and outsourced services that Duetto consolidates.
```
systemsCostSavings = annualRMSystemsCost + annualConsultingCost
```

### Strategic Time Reclaimed (productivity metric — not monetized)
```
hoursSavedPerWeek = MIN(hoursPerWeekManual × 0.50, 20)
```
Represents up to 50% of manual pricing time freed. Capped at 20 hrs/week. Shown as a qualitative benefit, not added to financial totals.

---

## 7. Annual Financial Impact

The headline number shown throughout the calculator.
```
totalAnnualImpact = annualIncrementalRoomRevenue + systemsCostSavings
```

---

## 8. Duetto Investment

### Annual Recurring Cost
```
duettoAnnualCost = subscriptionCost                        [if manually entered]
                 + ohipConnectivityFee                     [if PMS is Opera Cloud]

                OR

duettoAnnualCost = estimateDuettoCost(totalRooms)          [if subscriptionCost = 0]
                 + ohipConnectivityFee
```

### Auto-Estimate Tiers (USD, used when no manual subscription is entered)
| Room Count | Estimated Annual Cost |
|---|---|
| < 100 | $18,000 |
| 100–199 | $28,000 |
| 200–349 | $42,000 |
| 350–499 | $58,000 |
| 500–749 | $75,000 |
| 750–999 | $95,000 |
| 1,000+ | $120,000 |

> Auto-estimates are always in USD and converted to the output currency using the configured exchange rate.

---

## 9. RMS Effectiveness Schedule (Year 1 Learning Curve)

Months 1–2 generate no revenue (implementation / go-live period, ~6–8 weeks). Months 3–12 ramp progressively as the team adopts Duetto.

**Default schedule:**
| Month | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Effectiveness | 0% | 0% | 40% | 50% | 60% | 70% | 75% | 80% | 85% | 90% | 95% | 100% |

These percentages are fully configurable in Tab 2 → ROI Projection.

**Monthly incremental revenue (Year 1):**
```
monthlyRevenue[m] = effectiveness[m] × (newRevPAR - currentRevPAR) × totalRooms × 30
```

**Year 1 effective ramp factor** (used in 5-year projection):
```
year1Ramp = SUM(effectiveness[1..12]) / 12
```
With defaults: `(0+0+40+50+60+70+75+80+85+90+95+100)/12 = 62.1%`

---

## 10. ROI Metrics

### ROI Multiple
```
roiMultiple = totalAnnualImpact / duettoAnnualCost
```

### Net ROI Percent
```
netROIPercent = ((totalAnnualImpact - duettoAnnualCost) / duettoAnnualCost) × 100
```

### Payback Period (months)
Simulated month-by-month. The implementation fee is treated as an upfront cost at contract signing (month 0). Subscription accrues monthly. Revenue accrues according to the RMS effectiveness schedule.

```
cumulativeCost[0]    = implementationFee                    ← at signing
cumulativeCost[m]    = cumulativeCost[m-1] + (duettoAnnualCost / 12)

monthlyBaseImpact    = combinedRevPARUplift / 12
cumulativeRevenue[m] = cumulativeRevenue[m-1] + effectiveness[m] × monthlyBaseImpact

paybackMonth = first m where cumulativeRevenue[m] ≥ cumulativeCost[m]
```

If break-even is not reached within the 12-month effectiveness schedule, the payback is projected beyond Year 1 assuming 100% effectiveness from Month 13 onwards:
```
deficit     = cumulativeCost[12] - cumulativeRevenue[12]
netMonthly  = monthlyBaseImpact - (duettoAnnualCost / 12)
paybackMonths = 12 + CEIL(deficit / netMonthly)
```

---

## 11. 5-Year Value Creation

### Per-Year Duetto Investment Schedule
```
Year 1:            duettoAnnualCost + implementationFee
Years 2..N:        duettoAnnualCost                           (N = initialContractYears)
Years N+1..5:      duettoAnnualCost × 1.05^(year − N)         (5% annual escalation post-contract)
```

### Per-Year Revenue and Impact
```
rampFactor[year]      = year1Ramp          (Year 1, from effectiveness schedule)
                      = 1.0                (Years 2–5)

marketMultiplier[year] = (1 + marketGrowthRate)^(year − 1)

incrementalRevenue[year] = baseProjection.totalIncrementalRevenue
                         × marketMultiplier[year]
                         × rampFactor[year]

costSavings[year]       = baseProjection.totalCostSavings
                         × marketMultiplier[year]
                         × rampFactor[year]

totalImpact[year]       = incrementalRevenue[year] + costSavings[year]
```

### Net Benefit and Cumulative
```
netBenefit[year]         = totalImpact[year] − duettoInvestment[year]
cumulativeNetBenefit[y]  = SUM(netBenefit[1..y])
```

### Per-Year ROI %
```
roiPercent[year] = ((totalImpact[year] − duettoInvestment[year]) / duettoInvestment[year]) × 100
```

### 5-Year Aggregate Metrics
```
totalFiveYearImpact      = SUM(totalImpact[1..5])
totalFiveYearNet         = SUM(netBenefit[1..5])
totalFiveYearInvestment  = SUM(duettoInvestment[1..5])
fiveYearROIMultiple      = totalFiveYearImpact / totalFiveYearInvestment
```

### Property Valuation Impact
```
incrementalNOI   = totalImpact[Year 5] × 0.85      ← 85% flow-through to NOI
valuationImpact  = incrementalNOI / capRate
```
The cap rate defaults to 7.5% and is configurable in the Financial Assumptions panel.

---

## 12. Portfolio Mode Aggregation

When 2+ properties are entered, all inputs are aggregated into a single blended set before calculations run.

**Room-count weighted average** (for rate and mix metrics):
```
blendedADR         = SUM(property.currentADR × property.totalRooms) / totalRooms
blendedOccupancy   = SUM(property.currentOccupancy × property.totalRooms) / totalRooms
blendedGroupPct    = SUM(property.groupBusinessPercent × property.totalRooms) / totalRooms
blendedYieldable   = SUM(property.yieldablePercent × property.totalRooms) / totalRooms
```

**Summed** (for cost metrics):
```
totalRooms         = SUM(property.totalRooms)
annualRMSystemsCost = SUM(property.annualRMSystemsCost)
annualConsultingCost = SUM(property.annualConsultingCost)
duettoAnnualCost   = SUM(property.duettoAnnualCost OR estimateDuettoCost(property.totalRooms))
```

---

## 13. Market Segment Benchmark (CoStar)

When a CoStar Hospitality Market Report is uploaded, the calculator computes the year-over-year change for the property's hotel class segment.

**Segment classes:** Luxury & Upper Upscale · Upscale & Upper Midscale · Midscale & Economy

### Segment YoY Calculation
Uses the two most recent non-forecast years from the segment's historical data.
```
revparPct = ((currentYear.revpar − priorYear.revpar) / priorYear.revpar) × 100
adrPct    = ((currentYear.adr − priorYear.adr) / priorYear.adr) × 100
occDelta  = currentYear.occupancy − priorYear.occupancy          ← in percentage points
```

### Market Outperformance (Executive Summary)
```
outperformancePP = projectedRevPARImprovement% − segmentYoY.revparPct
```
Positive values mean the property's projected growth with Duetto exceeds the market segment's recent historical trend.

---

## 14. Scenario Defaults

| Scenario | RevPAR Uplift | Market Growth Rate |
|---|---|---|
| Conservative | 5% | 2.0% / year |
| Moderate | 8% | 2.5% / year |
| Aggressive | 12% | 3.0% / year |

All values are fully overridable. Market signals from Duetto client hotel data or CoStar YoY data can be synced directly to the scenario assumptions.

---

## 15. What Is and Is Not Included

| Revenue Source | Included | Notes |
|---|---|---|
| RevPAR uplift (ADR + occupancy) on yieldable inventory | ✅ | Primary revenue driver |
| Systems cost savings (rate shoppers, RM tools, consulting) | ✅ | Direct cost replacement |
| Group revenue uplift | ❌ | Removed — group contracts are typically pre-negotiated |
| OTA commission savings / distribution shift | ❌ | Removed — depends on channel strategy outside Duetto scope |
| Labor cost monetization | ❌ | Time saved is shown as a productivity metric only, not added to financial totals |
