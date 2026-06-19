# Design: Float Degrees Support (numeric(10,2))

**Date**: 2026-06-19  
**Author**: Claude Code  
**Status**: Design Review

---

## Overview

Add support for decimal mission scores (e.g., 47.5, 47.25) by changing score fields from `integer` to `numeric(10,2)` across the database, TypeScript types, frontend validation, and RPC functions. This allows fine-grained scoring while maintaining precision to 2 decimal places.

## Requirements

- Support float scores up to 2 decimal places (47.5, 47.25, etc.)
- Strict frontend validation — reject inputs with >2 decimals (e.g., 47.555)
- Apply to both mission max points and awarded points
- Maintain existing constraints and data safety

## Affected Systems

### 1. Database Schema

**Tables to modify:**
- `challenges`: `points` column (max points available per mission)
- `family_scores`: `points_awarded` column (score awarded to a family)
- `tournament_match_scores`: `points_awarded` column (score in tournament matches)

**Change**: `integer` → `numeric(10,2)`

**Safety**: Existing integer data converts losslessly to numeric. PostgreSQL handles the cast automatically.

**Constraints**: Existing CHECK constraints (`points_awarded >= 0`, etc.) remain unchanged.

**Migration file**: Single migration `20260619000000_float_degrees_support.sql`

### 2. TypeScript Types

**No changes needed** — JavaScript `number` type already handles decimals natively. Existing type definitions in `services/challenges.ts` and `services/tournamentService.ts` are compatible.

### 3. Frontend Validation (ScoreInputModal)

**Component**: `components/ScoreInputModal.tsx`

**Changes**:
- Keyboard type: iOS uses `decimal-pad`, Android uses `number-pad` with custom filtering
- Input regex validation: `/^\d+(\.\d{0,2})?$/`
  - Accepts: `47`, `47.5`, `47.25`, `0`, `100.00`
  - Rejects: `47.555`, `abc`, `47.`
- Error message: "Enter a number with up to 2 decimal places"
- Placeholder: Update to show example like `0-100.00`

**Validation logic**:
```typescript
const isValidDecimal = (value: string): boolean => {
  return /^\d+(\.\d{0,2})?$/.test(value);
};
```

**User flow**:
1. User enters score (e.g., "47.5")
2. Regex validates in real-time
3. On submit, parse and send to backend
4. Backend receives `47.5` as numeric, stores with 2 decimal precision

### 4. RPC Functions

**Status**: Already compatible.

The `upsert_family_score` RPC function in `20260604010000_fix_missions_and_rpc.sql` already accepts `numeric` types:
- Parameter `p_points_awarded` is `numeric`
- Return type `points_awarded` is `numeric`

No changes needed to RPC definitions or calls from `services/challenges.ts`.

### 5. Display & Formatting

**No explicit changes needed**, but consider:
- Display `50` not `50.00` (strip trailing zeros for readability)
- Existing leaderboard and challenge screens will display numeric values as-is
- Optional: Add formatting utility `formatScore(score: number): string` to centralize display logic

## Data Handling

### Default & Constraints
- `points_awarded` still defaults to `0` (becomes `0.00`)
- Min value: `0.00`
- Max value: Challenge's `points` value (e.g., if challenge has `100.50` points, can award `0-100.50`)
- Null: Not applicable — `points_awarded` is non-null with default

### Backward Compatibility
- Existing integer scores (e.g., 50) will have `.00` appended in storage but will display/calculate identically
- No data loss or precision issues

## Testing Strategy

### Unit Tests
- Regex validation: test valid inputs (47, 47.5, 47.25) and invalid inputs (47.555, abc, 47.)
- Type conversion: verify numeric columns accept and store decimal values correctly

### Integration Tests
- Submit score with 2 decimals (e.g., 47.25), verify it's stored and retrieved correctly
- Verify leaderboard calculations with decimal scores
- Verify tournament scoring with decimal scores

### Manual Testing
1. Submit a challenge with score `47.5` → should succeed
2. Submit with score `47.555` → should show validation error
3. Submit with score `47` → should succeed (stored as `47.00`)
4. Verify the score displays correctly on leaderboard

## Migration Strategy

**Single-step migration** (no downtime):
1. Create migration file with three `ALTER TABLE` statements
2. Run migration (PostgreSQL handles cast automatically)
3. Deploy updated frontend validation
4. Existing data remains accessible and unchanged in behavior

**Rollback**: If needed, reverse migration changes columns back to `integer` (data loss only if scores have decimals after deploy).

## Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/20260619000000_float_degrees_support.sql` | New file: ALTER TABLE statements for 3 columns |
| `components/ScoreInputModal.tsx` | Add decimal validation regex, keyboard type fix |
| `services/challenges.ts` | No changes (types already support floats) |
| `services/tournamentService.ts` | No changes (if exists) |
| `DDL.SQL` | Update schema documentation (points_awarded: numeric(10,2)) |

## Success Criteria

- ✓ Database migration runs successfully
- ✓ Frontend accepts and validates 2-decimal inputs
- ✓ Frontend rejects >2-decimal inputs
- ✓ Scores with decimals persist and display correctly
- ✓ Leaderboard calculations work with decimal scores
- ✓ Tournament scoring works with decimal scores
- ✓ No data loss in migration
