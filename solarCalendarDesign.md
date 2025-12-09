This Design Document outlines the specifications for **The Solar Calendar**, a perennial calendar system designed for mathematical regularity and solar alignment.

---

# Design Document: The Solar Calendar

## 1. System Overview
The Solar Calendar is a fixed, perennial calendar system. Unlike the Gregorian calendar, where dates drift across days of the week each year, the Solar Calendar locks every specific date to a specific day of the week forever.

This is achieved by extracting the surplus days of the year (365 or 366 days) into a distinct "intercalary" period called the **Solstice Days**, which exist outside the standard weekly cycle.

### Key Characteristics
* **Total Year Length:** 365 days (Common) / 366 days (Leap).
* **Months:** 12 months of exactly 30 days each.
* **Weeks:** 6-day weeks (Standard 7-day week with Tuesday removed).
* **The Solstice Interval:** A 5 or 6-day period separating the years.

---

## 2. Calendar Epoch & Numbering
### The Epoch (Year 0)
* **Definition:** **Year 0** is defined as the solar year beginning in **1999** and ending in **2000**.
* **Negative Years:** Any year prior to the start of the Epoch is designated as a negative year (e.g., Year -1 is 1998-1999).

### The Solar Offset
The calendar is intentionally offset from the Gregorian calendar by approximately one week to align Solstice Day 3 with the astronomical Summer Solstice.
* **Solar July 1st** $\approx$ **Gregorian June 24th**.

---

## 3. The Structure of Time
### A. The Week
The week consists of **6 days**. The day "Tuesday" is abolished to fit the 30-day month perfectly (5 weeks $\times$ 6 days = 30 days).

| Order | Day Name | Abbreviation |
| :--- | :--- | :--- |
| 1 | Monday | M |
| 2 | Wednesday | W |
| 3 | Thursday | T |
| 4 | Friday | F |
| 5 | Saturday | S |
| 6 | Sunday | S |

### B. The Months
The year consists of 12 months. Each month has exactly 30 days. Because the Solstice Days handle the excess time, **every month starts on a Monday and ends on a Sunday.**

1.  **July** (30 Days)
2.  **August** (30 Days)
3.  **September** (30 Days)
4.  **October** (30 Days)
5.  **November** (30 Days)
6.  **December** (30 Days)
7.  **January** (30 Days)
8.  **February** (30 Days)
9.  **March** (30 Days)
10. **April** (30 Days)
11. **May** (30 Days)
12. **June** (30 Days)

**Total Monthly Days:** $12 \times 30 = 360$ Days.

---

## 4. The Solstice Days (Intercalary Period)
Between the end of one year (June 30th) and the start of the next (July 1st), there exists a "Non-Calendar" period.

* **Placement:** These days belong to neither the preceding nor the following year exclusively. They are the bridge.
* **Weekday Status:** These days **do not have days of the week**. The weekly cycle pauses.
* **Notation:** Written as `"Solstice Day [N], Y[Previous]-[Next]"` (e.g., *Solstice Day 3, Y5-6*).

### The Solstice Alignment
The period is centered on the astronomical Summer Solstice.
* **Solstice Day 3** is always the day of the Summer Solstice.

### Leap Year Mechanics
* **Rule:** Every 4 years is a Leap Year (Year 0, Year 4, Year 8, etc.).
* **Implementation:** In a standard year, there are **5 Solstice Days**. In a Leap Year, there are **6 Solstice Days**.
* **Insertion:** The extra day is added to the **end** of the period (Solstice Day 6).
    * *Note:* This makes the solstice slightly off-center for that specific year, but preserves the rule that Solstice Day 3 is the event day.

---

## 5. Visualization
### Standard Month View
Because every month is identical in structure, you only need one calendar page to represent every month in history.

| **Mon** | **Wed** | **Thu** | **Fri** | **Sat** | **Sun** |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 01 | 02 | 03 | 04 | 05 | 06 |
| 07 | 08 | 09 | 10 | 11 | 12 |
| 13 | 14 | 15 | 16 | 17 | 18 |
| 19 | 20 | 21 | 22 | 23 | 24 |
| 25 | 26 | 27 | 28 | 29 | 30 |

### The Solstice Transition (Example: Year 5 into Year 6)
*End of Year 5:* June 30th (Sunday)

| **Solstice Days (No Weekdays)** | **Event Alignment** |
| :--- | :--- |
| Solstice Day 1, Y5-6 | Prep Day |
| Solstice Day 2, Y5-6 | Prep Day |
| **Solstice Day 3, Y5-6** | **Summer Solstice** |
| Solstice Day 4, Y5-6 | Post-Solstice |
| Solstice Day 5, Y5-6 | Post-Solstice |
| *Solstice Day 6, Y5-6* | *(Only occurs in Leap Years)* |

*Start of Year 6:* July 1st (Monday)

---

## 6. Implementation Notes for Software/Date Converters
When programming this calendar, treat the Solstice Days as a "13th Month" with null weekday values.

1.  **Day Count:**
    * Days 1–360: Standard Months (July–June).
    * Days 361–365: Solstice Days 1–5.
    * Day 366: Solstice Day 6 (Leap Years only).
2.  **Modulo Math:**
    * To find the day of the week for any date *within* the months: `(Day_of_Month - 1) % 6`.
    * 0=Mon, 1=Wed, 2=Thu, 3=Fri, 4=Sat, 5=Sun.
