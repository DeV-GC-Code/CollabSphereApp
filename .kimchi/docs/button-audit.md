# Button Audit Report

## CSS Button Classes

### Auth Buttons
**.auth-btn**
```css
.auth-btn {
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 14px;
  font-family: Geist, Inter, sans-serif;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}
```

**.auth-btn--primary**
```css
.auth-btn--primary {
  background: linear-gradient(135deg, #7CB9FD 0%, #4F94F9 55%, #3B82F6 100%);
  color: #fff;
  box-shadow: 0 4px 18px rgba(59,130,246, 0.35);
}
.auth-btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(59,130,246, 0.45);
}
.auth-btn--primary:active:not(:disabled) {
  transform: scale(0.98);
  box-shadow: none;
}
```

**.auth-btn--outline**
```css
.auth-btn--outline {
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
}
.auth-btn--outline:hover {
  border-color: rgba(255, 255, 255, 0.38);
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-1px);
}
```

### App Buttons
**.button** (base class)
```css
.button, .text-button, .segmented-control button, .action-button {
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  font-family: Geist, Inter, sans-serif;
  font-weight: 700;
  font-size: 14px;
  transition: all var(--t);
}
.button { padding: 0 18px; }
.button--sm { min-height: 34px; padding: 0 12px; font-size: 13px; }
.button--block { width: 100%; }
```

**.button--primary**
```css
.button--primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
}
.button--primary:hover:not(:disabled) {
  background: #165A1C;
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
  transform: translateY(-1px);
}
.button--primary:active:not(:disabled) { transform: scale(0.97); box-shadow: none; }
```

**.button--gradient**
```css
.button--gradient {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
}
.button--gradient:hover:not(:disabled) {
  background: #165A1C;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
}
.button--gradient:active:not(:disabled) { transform: scale(0.97); box-shadow: none; }
```

**.button--secondary**
```css
.button--secondary {
  border: 1.5px solid var(--outline);
  background: var(--surface-2);
  color: var(--primary);
  box-shadow: var(--shadow-sm);
}
.button--secondary:hover:not(:disabled) {
  border-color: var(--outline-strong);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
```

### Other Button Variants
**.action-button**
```css
.action-button {
  min-height: 34px; padding: 0 12px;
  border: 1.5px solid transparent; border-radius: 9px;
  background: transparent; color: var(--text-soft); font-size: 13px;
  transition: all var(--t);
}
.action-button:hover { color: var(--primary); border-color: var(--outline); background: var(--surface-soft); transform: translateY(-1px); }
.action-button.is-liked  { color: #DC2626 !important; border-color: rgba(220,38,38,0.22) !important; background: rgba(220,38,38,0.07) !important; }
.action-button.is-saved  { color: var(--primary) !important; border-color: var(--outline) !important; background: var(--surface-soft) !important; }
```

**.topbar__icon, .icon-button**
```css
.topbar__icon, .icon-button {
  position: relative;
  width: 36px; height: 36px;
  border: 1.5px solid transparent;
  border-radius: 50%;
  display: inline-grid; place-items: center;
  background: transparent;
  color: var(--text-soft);
  transition: all var(--t);
}
.topbar__icon:hover, .icon-button:hover {
  border-color: var(--outline);
  background: var(--surface-soft);
  color: var(--primary);
  transform: translateY(-1px);
}
```

## Bugs Found

### 1. Gradient Button Uses Solid Color (File: collabsphere-ui/src/styles/app.css, Line 572-582)
**Issue**: `.button--gradient` uses `background: var(--primary)` (solid color) instead of a gradient background as the class name suggests.
**Current CSS**:
```css
.button--gradient {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
}
```
**Expected**: Should use a gradient similar to `.auth-btn--primary` or another defined gradient.

### 2. Primary Button Hover Color Mismatch (File: collabsphere-ui/src/styles/app.css, Line 564-566)
**Issue**: `.button--primary:hover` uses `#165A1C` (green) instead of a blue shade that matches the brand's electric indigo (`--primary: #2563EB`).
**Current CSS**:
```css
.button--primary:hover:not(:disabled) {
  background: #165A1C; /* Green - should be blue */
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
  transform: translateY(-1px);
}
```
**Note**: The brand's primary color is `--primary: #2563EB` (electric indigo), so hover should be a shade of blue, not green.

### 3. Gradient Button Hover Color Mismatch (File: collabsphere-ui/src/styles/app.css, Line 577-579)
**Issue**: `.button--gradient:hover` also uses `#165A1C` (green) instead of maintaining a gradient or using a blue hover state.
**Current CSS**:
```css
.button--gradient:hover:not(:disabled) {
  background: #165A1C; /* Green - should maintain gradient or use blue */
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
}
```

### 4. Inconsistent Border Radius Values
**Issue**: Different button classes use inconsistent border-radius values:
- `.auth-btn`: `border-radius: 14px`
- `.button`: `border-radius: 10px`
- `.action-button`: `border-radius: 9px`
- `.topbar__icon, .icon-button`: `border-radius: 50%` (circular)

### 5. Missing Transition on Some States
**Issue**: While most buttons have transitions defined, some active states may be missing smooth transitions.
**Example**: `.button--primary:active:not(:disabled)` has `transform: scale(0.97);` but no explicit transition property (though it inherits from base).

### 6. Override Conflicts in Dark Theme Sections
**Issue**: Lines 3340-3342 and subsequent sections contain `!important` overrides that may conflict with intended button styles:
```css
.button--primary,
.button--gradient,
.auth-btn--primary {
  background: linear-gradient(135deg, #7CB9FD 0%, #4F94F9 52%, #3B82F6 100%) !important;
  /* ... */
}
```
This override changes the `.button--primary` and `.button--gradient` from solid colors to gradients, which conflicts with the earlier definitions.

## Button Usage in JSX

### Component → ClassName Mapping

**OnboardingModal.jsx**
- `<button className="button button--primary button--sm">`
- `<button className="button button--primary">`

**CreatePostModal.jsx**
- `<button className="icon-button" type="button" onClick={onClose} aria-label="Close">`
- `<button className="button button--gradient">`

**ContextRail.jsx**
- `<button className="icon-button">`
- `<button className="button button--secondary button--sm">`
- `<button className="button button--primary button--block">`

**SpheresPage.jsx**
- `<button className="button button--primary button--sm">`
- `<button className="icon-button" type="button" onClick={loadSpheres} aria-label="Refresh">`
- `<button className="button button--primary" type="submit" disabled={creating || !form.name.trim()}>`
- `<button className="button button--secondary button--sm" type="submit">Search</button>`
- `<button className={`button button--sm featured-sphere-card__btn${isJoined ? "" : " button--primary"}`}>`
- `<button className={`button${isJoined ? " button--secondary" : " button--primary"}`}>`
- `<button className={`button${isJoined ? " button--secondary" : " button--primary"}`}>`
- `<button className="button button--sm">`
- `<button className="button button--primary button--sm">`
- `<button type="button" className="button button--secondary" onClick={() => setHubView("posts")}>Cancel</button>`
- `<button className="button button--primary">`
- `<button className="button button--primary button--sm">`

**ThemeToggle.jsx**
- `<button className={`icon-button theme-toggle ${className`}>`

**TopBar.jsx** (implied from usage patterns)
- Uses `.topbar__icon` for various icon buttons

### Observed Patterns
1. **Primary Actions**: Use `button--primary` (e.g., submit buttons, primary CTAs)
2. **Secondary Actions**: Use `button--secondary` (e.g., cancel buttons, secondary options)
3. **Icon-Only Buttons**: Use `icon-button` or `topbar__icon` (e.g., close buttons, theme toggles)
4. **Gradient CTAs**: Use `button--gradient` (e.g., Create Post button)
5. **Size Variations**: Use `button--sm` for smaller buttons
6. **Full Width**: Use `button--block` for full-width buttons
7. **Conditional Styling**: Dynamic class names based on state (e.g., `isJoined ? "button--secondary" : "button--primary"`)

## Current Transition/Animation Properties

### Base Transition Variable
```css
:root {
  --t: 0.16s ease;
  --t-fast: 0.10s ease;
}
```

### Button Transitions
- **Base buttons** (`.button`, `.text-button`, etc.): `transition: all var(--t);` (0.16s ease)
- **Auth buttons** (`.auth-btn`): `transition: all 0.2s ease;`
- **Icon buttons** (`.topbar__icon`, `.icon-button`): `transition: all var(--t);` (0.16s ease)
- **Action buttons** (`.action-button`): `transition: all var(--t);` (0.16s ease)

### Hover/Focus/Active State Issues

#### Hover State Issues
1. **Color Mismatch**: As noted above, hover states use green (#165A1C) instead of brand-consistent blue shades
2. **Inconsistent Transform**: Some hover states use `transform: translateY(-1px);` while others may not
3. **Box-shadow Inconsistency**: Varying box-shadow values on hover states

#### Focus State Issues
- **Missing explicit focus styles**: While `:focus-visible` is defined globally, buttons don't have specific focus ring styles beyond the global definition
- **Reliance on global `:focus-visible`**: Buttons inherit the global focus style (`outline: 2px solid var(--primary-light); outline-offset: 3px; border-radius: 4px;`)

#### Active State Issues
1. **Transform Consistency**: Most active states use `transform: scale(0.97);` but some use different scales (e.g., `.auth-btn--primary:active` uses `scale(0.98)`)
2. **Box-shadow Removal**: Active states commonly remove box-shadow (`box-shadow: none;`), which may be inconsistent with desired feedback

## Recommendations for Fixes

### 1. Fix Gradient Button
**Location**: `collabsphere-ui/src/styles/app.css`, lines 572-582
**Change**: Replace solid background with a gradient
```css
.button--gradient {
  background: linear-gradient(135deg, #7CB9FD 0%, #4F94F9 55%, #3B82F6 100%); /* Match auth-btn--primary */
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.28);
}
.button--gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #8CD0FF 0%, #5FA0FE 55%, #4D90F9 100%); /* Lighter gradient */
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
}
```

### 2. Fix Primary Button Hover Color
**Location**: `collabsphere-ui/src/styles/app.css`, lines 564-566
**Change**: Replace green hover with blue shade
```css
.button--primary:hover:not(:disabled) {
  background: #1D4ED8; /* Blue-800, darker shade of --primary (#2563EB) */
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
  transform: translateY(-1px);
}
```

### 3. Fix Gradient Button Hover Color
**Location**: `collabsphere-ui/src/styles/app.css`, lines 577-579
**Change**: Replace green hover with gradient hover
```css
.button--gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #8CD0FF 0%, #5FA0FE 55%, #4D90F9 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37,99,235,0.38);
}
```

### 4. Standardize Border Radius
**Recommendation**: Consider standardizing border radius for consistency:
- Regular buttons: 10px (matches `--radius` token)
- Auth buttons: 14px (could be `--radius-lg` or custom)
- Icon buttons: 50% (should remain circular)

### 5. Address !important Overrides
**Location**: Lines 3340-3360+ in app.css
**Issue**: The `!important` overrides in the `[data-theme="dark"]` sections and other areas may be causing conflicts
**Recommendation**: Review and refactor these overrides to use more specific selectors rather than `!important` where possible

### 6. Add Explicit Focus Styles for Buttons
**Recommendation**: Add explicit focus styles for better accessibility
```css
.button:focus-visible,
.auth-btn:focus-visible,
.action-button:focus-visible,
.icon-button:focus-visible,
.topbar__icon:focus-visible {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
  border-radius: 8px; /* Slightly smaller than button border-radius */
}
```

### 7. Ensure Consistent Transition Properties
**Recommendation**: Verify all button states have smooth transitions:
```css
/* Ensure all states transition smoothly */
.button--primary,
.button--gradient,
.button--secondary,
.auth-btn--primary,
.auth-btn--outline,
.action-button,
.icon-button,
.topbar__icon {
  transition: all var(--t); /* 0.16s ease */
}
```

### 8. Review Active State Consistency
**Recommendation**: Standardize active state transforms:
```css
/* Consistent active state scale */
.button--primary:active:not(:disabled),
.button--gradient:active:not(:disabled),
.button--secondary:active:not(:disabled),
.auth-btn--primary:active:not(:disabled),
.auth-btn--outline:active:not(:disabled),
.action-button:active:not(:disabled),
.icon-button:active:not(:disabled),
.topbar__icon:active:not(:disabled) {
  transform: scale(0.97);
}
```

