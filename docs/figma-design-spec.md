# ParkEasy Figma-Ready Design Spec

## Brand Direction
- Positioning: cinematic urban-tech marketplace for parking
- Emotional goal: reduce parking stress while making the platform feel premium, intelligent, and alive
- Core audience balance: renters and hosts equally visible; admin is operationally premium but visually restrained

## Typography
- Heading font: Sora
- Body font: Manrope
- Type scale:
  - Display XL: 88/0.92/700
  - Display L: 64/0.94/700
  - Heading L: 44/1.0/700
  - Heading M: 32/1.05/700
  - Body L: 18/1.75/500
  - Body M: 16/1.7/500
  - Meta: 12/1.4/700 with tracking 0.16em

## Color System
- Background base: `#08111F`
- Deep background: `#040814`
- Surface: `rgba(10,21,37,0.72)`
- Surface strong: `rgba(11,24,41,0.9)`
- Primary accent: `#67F0CB`
- Secondary accent: `#62A7FF`
- Warm accent: `#FF8F70`
- Text primary: `#F4F8FF`
- Text muted: `#9EB0CC`
- Divider: `rgba(162,187,255,0.16)`

## Motion Language
- Primary reveal: fade + rise 36px over 0.72s, ease `[0.22, 1, 0.36, 1]`
- Scroll choreography: stagger hero metrics, story cards, and listing cards at 80-120ms offsets
- Hover behavior: lift 2-4px, slight glow increase, no cartoon bounce
- Ambient motion: slow orbital rotation, pulsing field gradients, floating information cards
- Success moments: QR/booking confirmations should use luminous radial expansion plus vertical snap-in panels

## 3D Direction
- Style: abstract city-grid sculpture, not literal toy cars everywhere
- Hero object: a layered parking-city core made of rounded blocks, orbital rings, and luminous plinths
- Materials: glossy dark metallic base with teal/blue/coral emissive accents
- Camera: 3/4 perspective, mild drift, no uncontrolled user orbit for the landing page
- Lighting: soft ambient with two accent point lights and one crisp directional light

## Page Specs
### Home
- Left: narrative, CTA, trust tags
- Right: 3D city-core canvas with two floating stat overlays
- Followed by: metrics row, design-story trio, feature panels, premium listing cards

### Search
- Split between command panel and animated map surface
- Filters appear as dashboard-grade chips
- Results show status, pricing, tags, and intent-first CTA

### Listing Detail
- Hero-style listing reveal
- Right rail booking card
- Lower trust architecture and experience timeline panels

### Renter Dashboard
- Controlled, less theatrical than marketing
- High-confidence cards for upcoming bookings, savings, and scan readiness

### Host Dashboard
- Premium earnings/control room feel
- Pricing intelligence, listing pipeline, revenue status, verification state

### Admin Dashboard
- Mission-control restraint
- Clear metric hierarchy with fast moderation queue actions

## Component Inventory
- Sticky glass navbar
- Hero 3D canvas shell
- Motion reveal container
- Metric card
- Listing card
- Filter pill
- Booking rail card
- Glass info card
- Timeline card
- Dashboard summary card
- CTA buttons: primary luminous, secondary glass

## Spacing and Radius
- Base spacing unit: 8
- Common stack spacing: 20 / 24 / 32
- Primary surface radius: 28
- Inner card radius: 18-24

## Implementation Notes
- Marketing pages can carry the heavier motion load
- Product pages should keep the same aesthetic but reduce visual noise by ~25%
- 3D should degrade gracefully on lower-power devices by keeping geometry simple
- API-driven cards should preserve the same layout even when data is sparse or loading