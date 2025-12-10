# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Boek 't!** is an interactive accounting game designed for HBO Bedrijfskunde (Business Administration) students at HAN University of Applied Sciences. The game teaches fundamental accounting principles through time-pressured transaction processing across 15 different business scenarios.

**Language**: Dutch (all UI text, transaction descriptions, and educational content)

## Key Educational Principles

The game teaches students to distinguish between:
1. **Opbrengst ≠ Ontvangst** (Revenue ≠ Cash Receipt) - sales on credit
2. **Kost ≠ Uitgave** (Cost ≠ Cash Expense) - purchases on inventory
3. **Aflossen is GEEN kost** (Debt repayment is NOT a cost) - exchange of cash for reduced liability
4. **Afschrijving is KOST maar geen UITGAVE** (Depreciation is a COST but not an EXPENSE) - no cash outflow
5. **Vooruitbetalingen** (Prepayments) - cash receipt but not yet revenue

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (localhost:5173)
npm run dev

# Build for production (outputs to ./dist)
npm run build

# Preview production build
npm run preview
```

## Deployment

- **Method**: GitHub Actions → GitHub Pages
- **Trigger**: Push to `main` branch
- **Build artifact**: `./dist` directory
- **Base path**: `/boek-t/` (configured in [vite.config.js:7](vite.config.js#L7))
- **Workflow**: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## Architecture

### Single Component Design

The entire game is implemented as **one large React component** in [src/BoekhoudingGame.jsx](src/BoekhoudingGame.jsx) (~2866 lines). This is intentional - no need to split into smaller components unless specifically requested.

### Data Structure

**Bedrijven (businesses)** database (lines 7-1973):
- 15 business scenarios (koffiebar, supermarkt, hotel, etc.)
- Each business has:
  - `openingsBalans`: Initial balance sheet with 8 account categories
  - `transacties`: 7 transactions teaching different accounting concepts
  - `kleur`: Tailwind color theme for UI

**Transactions** use getter functions for dynamic amounts:
- `getOmschrijving(bedragen)`: Transaction description with amounts
- `getDetail(bedragen)`: Additional detail text
- `getMutaties(bedragen)`: Correct account mutations
- `bedragen`: Base amounts (randomized ±15% each game)

**Balance sheet accounts** (8 categories):
- Assets: `vasteActiva`, `voorraad`, `debiteuren`, `bank`, `kas`
- Liabilities + Equity: `eigenVermogen`, `lening`, `crediteuren`

### Game State Machine

Three states tracked by `gameState`:
1. **`'intro'`**: Company selection screen (lines 2269-2349)
2. **`'playing'`**: Transaction processing (lines 2350-2600)
3. **`'feedback'`**: Shows result after each transaction
4. **`'complete'`**: Final score screen

### Timer System

Progressive difficulty via time limits ([src/BoekhoudingGame.jsx:2054-2058](src/BoekhoudingGame.jsx#L2054-L2058)):
- Transactions 1-3: 180 seconds (3 minutes)
- Transactions 4-6: 120 seconds (2 minutes)
- Transaction 7: 60 seconds (1 minute)

Timeout handling ([src/BoekhoudingGame.jsx:2083-2114](src/BoekhoudingGame.jsx#L2083-L2114)):
- Shows correct mutations
- Updates balances automatically
- Tracks timeout count (affects final grade)

### Scoring System

Points per transaction based on hints used ([src/BoekhoudingGame.jsx:2197-2199](src/BoekhoudingGame.jsx#L2197-L2199)):
- 0 hints: 30 points (counts as "perfect")
- 1 hint: 20 points
- 2 hints: 10 points
- 3 hints: 5 points

Final grade titles (max 210 points):
- 180+: "Meester-boekhouder"
- 150+: "Expert"
- 120+: "Gevorderde"
- 90+: "Beginner"
- <90: "Leerling"

### Randomization

**Per game session** (not per transaction):
- Business selected randomly from 15 options ([src/BoekhoudingGame.jsx:2020](src/BoekhoudingGame.jsx#L2020))
- `openingsBalans`: ±10% variation, eigenVermogen recalculated to balance ([src/BoekhoudingGame.jsx:1989-2001](src/BoekhoudingGame.jsx#L1989-L2001))
- Transaction `bedragen`: ±15% variation ([src/BoekhoudingGame.jsx:1978-1987](src/BoekhoudingGame.jsx#L1978-L1987))

## Styling

- **Framework**: Tailwind CSS 3.4
- **Color themes**: Each business has a `kleur` property (e.g., 'pink', 'green', 'purple')
  - Applied as `bg-{kleur}-100`, `text-{kleur}-800`, `border-{kleur}-300`, etc.
- **Emoji**: Each business has an emoji identifier for visual recognition
- **Responsive**: Mobile-first design with single-column layout

## Important Implementation Notes

### Financial Calculations

The game tracks three parallel financial statements:
1. **Balance sheet** (`balans` state): 8 accounts updated with each transaction
2. **Income statement** (`resultaat` state): 5 categories (opbrengsten, kostprijs, afschrijving, rente, overig)
3. **Cash flow** (`liquiditeit` state): beginsaldo, ontvangsten, uitgaven

Balance validation is critical:
```javascript
totaalActiva = vasteActiva + voorraad + debiteuren + bank + kas
totaalPassiva = eigenVermogen + lening + crediteuren
// Must always equal
```

### Transaction Validation

Two-phase validation ([src/BoekhoudingGame.jsx:2151-2195](src/BoekhoudingGame.jsx#L2151-L2195)):
1. **Accounts selection**: Check if correct accounts are selected
2. **Amounts & direction**: Check if amounts and +/- are correct

Feedback specificity:
- Missing vs. extra accounts
- Correct amount but wrong direction
- Wrong amount entirely

### Hint System

Three progressive hints per transaction:
- Stored in `tx.hints[]` array
- `hintLevel` state tracks how many hints shown (0-3)
- Each hint reveal reduces potential points
- `kernprincipe` shown at end explaining the core concept

## Testing the Game

To test a specific business scenario:
1. Modify line 2020 to select specific business by index instead of random:
   ```javascript
   const bedrijf = bedrijven[0]; // e.g., koffiebar
   ```
2. To disable randomization, comment out randomize calls in lines 2021-2024

To test without time pressure:
1. Comment out the timer useEffect (lines 2067-2081)
2. Or increase time limits in `getTimeLimit()` function

## Common Modifications

**Adding a new business**: Add to `bedrijven` array with required structure (openingsBalans + transacties array)

**Changing scoring**: Modify points array at [src/BoekhoudingGame.jsx:2197](src/BoekhoudingGame.jsx#L2197)

**Adjusting time limits**: Edit `getTimeLimit()` function at [src/BoekhoudingGame.jsx:2054-2058](src/BoekhoudingGame.jsx#L2054-L2058)

**Updating deployment base path**: Edit `base` in [vite.config.js:7](vite.config.js#L7) to match GitHub repo name
