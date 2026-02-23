

# Unificar Precios: $49 / $89 / $149

Los precios correctos (de la landing page) son:
- **Starter**: $49/mo ($490/year)
- **Professional**: $89/mo ($890/year)  
- **Business/Enterprise**: $149/mo ($1,490/year)

## Archivos a modificar

### 1. `src/pages/PricingPage.tsx`
- Starter: $89 → $49, annual $890 → $490, annualMonthly $74 → $41
- Professional: $149 → $89, annual $1,490 → $890, annualMonthly $124 → $74
- Business: $249 → $149, annual $2,490 → $1,490, annualMonthly $207 → $124

### 2. `src/components/signup/PlanSelection.tsx`
- Starter: $89 → $49, annual $890 → $490
- Professional: $149 → $89, annual $1,490 → $890
- Business: $249 → $149, annual $2,490 → $1,490

### 3. `src/components/signup/PaymentStep.tsx`
- Same price updates in `planDetails` object

### 4. `src/components/SubscriptionGate.tsx`
- "Plans start at $89/month" → "Plans start at $49/month"

### 5. Stripe Price IDs
The Stripe price IDs in `useSubscription.ts` will need to be updated to match the new prices. This requires creating new prices in Stripe or verifying the existing price IDs correspond to the correct amounts. **This is critical** -- if the displayed prices don't match what Stripe charges, customers will be billed incorrectly.

## Important Note
The landing page (`Index.tsx`) already shows the correct prices -- no changes needed there. The plan name "Enterprise" on the landing page vs "Business" elsewhere is a minor inconsistency that can be addressed separately.

