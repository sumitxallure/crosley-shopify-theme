# Crosley PLP Reference Audit

Date: 2026-10-06

Primary reference: `Crosley PLP.dc.html`

Supporting render reference: `Crosley PLP Standalone.html`. The standalone file is
used only to reveal imported components such as Site Header, Product Tile, Site
Benefits, and Site Footer. The `.dc.html` file remains the source of truth for PLP
structure and default visibility.

## Page Structure

### 1. Global announcement and header

- A dark announcement bar displays `Free Shipping Site-Wide`.
- The PLP imports the shared Site Header as an overlay inside the collection hero.
- The standalone composition also shows promotional utility bars and a countdown,
  but those belong to the imported header rather than the PLP itself.
- Shopify implementation: reuse the theme's existing header group. Do not create a
  second PLP-specific header or announcement bar.

### 2. Collection hero

- Full-width lifestyle image with a dark overlay.
- Centered collection title: `Record Players`.
- Centered collection description below the title.
- Reference height is 380px on desktop and 260px below 700px.
- The mobile crop keeps the product as the focal point, but the long description
  becomes tight and needs controlled width and wrapping.

Recommended Shopify data:

- Title: `collection.title`.
- Description: `collection.description`.
- Image: `collection.image`, with an optional Theme Editor fallback image.
- Controls: show description, overlay opacity, image position, desktop height, and
  mobile height. Content remains data-driven rather than merchant-retyped.

### 3. Product controls toolbar

Desktop reference includes:

- Filter action.
- Product count.
- Sort dropdown.
- Grid-density controls for 3, 4, and 6 columns.

Mobile reference includes:

- Two equal actions: Filter and Sort By.
- The source also defines 1-column and 2-column density controls.
- Product count and desktop density controls are hidden.

Recommended changes:

- Use Shopify's existing `filters` block and `collection.sort_options` rather than
  custom filter/sort state.
- Keep 3-column and 4-column desktop density options if they work with the Horizon
  grid component.
- Do not copy the reference's behavior where the 6-column view hides title, price,
  and swatches. Product information must remain visible in every density.
- Default mobile to two columns. A one-column shopper control is optional and should
  be omitted from v1 unless it adds clear value.
- Give every icon button a visible focus state, accessible name, and at least a
  44px touch target.

### 4. Active filter chips

- Conditionally appears below the toolbar after a filter is selected.
- Each chip shows the filter group and selected value with a remove action.
- Price appears as one removable range chip.

Recommended Shopify implementation:

- Reuse Horizon's native active-filter output and URL parameters.
- Include a clear-all action when multiple filters are active.
- Preserve filtering state when sorting changes.

### 5. Filter drawer

- Left-side overlay drawer, 440px maximum width.
- Header contains `Filters` and a close icon.
- Scrollable body contains Color, Feature, and Price accordions.
- Color and Feature initially show a limited set with Show More/Show Less.
- Price includes a dual range control and numeric minimum/maximum fields.
- A fixed footer contains the primary `View Results` action.

Recommended Shopify implementation:

- Use `collection.filters` configured through Shopify Search & Discovery.
- Do not hard-code Color or Feature values in Liquid.
- Support Shopify filter types: list, boolean, price range, and visual swatches.
- Drawer must trap focus, close with Escape/backdrop, restore focus to the Filter
  button, lock background scrolling, and announce updated result counts.
- On mobile, keep the apply button reachable above safe-area insets.

### 6. Product grid

- Default layout is four columns on desktop and two columns on mobile.
- Twelve products are shown per page.
- Desktop supports 3, 4, and 6-column density modes.
- Grid spacing tightens on mobile.

Recommended Shopify implementation:

- Extend Horizon's existing `main-collection` section and product-grid behavior.
- Use Shopify's real `collection.products`; no copied product data.
- Keep square media containers with `object-fit: contain` and a quiet neutral
  background.
- Prevent horizontal page overflow at every breakpoint.
- Long titles must wrap without clipping or changing neighboring card widths.
- Include a useful empty state when a collection or filter result has no products.

### 7. Product card

Visible card content:

- Optional status label such as New or Best Seller.
- Square product image.
- Up to four color swatches and an optional `+N More` link.
- Uppercase product title.
- Product price.
- Clicking the image/title opens the PDP; selecting a swatch changes the displayed
  image in the reference.

Recommended changes:

- Build on Horizon's `_product-card` and `_product-card-gallery` blocks rather than
  duplicating card and cart behavior.
- Use real variant option data for swatches. Only treat an option as color when it is
  configured as a swatch/color option.
- Show compare-at pricing and sale state when Shopify product data provides them.
- Preserve sold-out state, variant availability, localization, and money formatting.
- Keep card text visible in all grid densities.
- Use semantic links rather than a `div` with `role="link"`.

### 8. Pagination

- Centered numeric pagination appears after the grid.
- The reference has two pages of twelve products.
- Previous and next arrows appear conditionally.
- Changing page scrolls back to the grid.

Recommended Shopify implementation:

- Use Shopify's `paginate` object and Horizon pagination controls.
- For v1, prefer standard pagination over infinite scroll because it is predictable,
  accessible, and closely matches the reference.
- Preserve filter and sort query parameters between pages.

### 9. Social gallery

- Light-gray band with eyebrow `Join Us` and heading `@CrosleyRadio`.
- Five square images on desktop.
- Mobile becomes a horizontally scrollable gallery with one large card visible.

Recommended Shopify implementation:

- Reuse the existing `crosley-social-gallery` section created for the homepage.
- Make the section optional in the collection template.
- Do not duplicate its markup or schema for PLP.

### 10. Site benefits

- Four shared benefits: Free Delivery, Buy Now Pay Later, Technical Support, and
  One-Year Warranty.
- Imported as a shared component.

Recommended Shopify implementation:

- Reuse the existing Crosley benefits section or shared section group.
- Keep it optional so merchants can remove it from collection templates.

### 11. Footer

- Shared newsletter, link columns, social links, region selector, copyright, and
  payment methods.
- Imported as the shared Site Footer.

Recommended Shopify implementation:

- Continue using the existing footer section group. The collection template should
  not own footer content.

## Conditional and Dormant UI

These elements exist in the source but are not visible in the default `.dc.html`
state:

- Active-filter chips, until a filter is selected.
- Sort menu, until Sort By is opened.
- Filter drawer and its accordion contents, until Filter is opened.
- Product of the Week: the entire inner block has `display: none` in the primary
  `.dc.html`. The standalone export shows an older/alternate visible composition.

Product of the Week should not be included in PLP v1. If requested later, it should
become a separate optional featured-product section, not part of the collection grid.

## UI/UX Decisions for the Shopify Version

Keep from the reference:

- Strong collection hero and restrained monochrome styling.
- Clear filter/sort toolbar.
- Spacious product grid with square media.
- Product badges, swatches, pagination, social proof, and shared service benefits.

Improve from the reference:

- Use Shopify-native filters, sorting, pagination, prices, variants, and availability.
- Never hide product information in a dense grid.
- Avoid duplicate global header/footer content.
- Ensure long product names wrap on mobile.
- Add complete keyboard, focus, drawer, and screen-reader behavior.
- Use responsive image widths and lazy loading below the fold.
- Keep Theme Editor controls focused on merchant decisions, not low-level CSS.

## Recommended Theme Editor Controls

Collection hero:

- Show/hide hero.
- Fallback image and image position.
- Show/hide collection description.
- Overlay opacity.
- Desktop and mobile hero height.

Collection grid:

- Products per page when pagination is enabled.
- Desktop card size or column density.
- Mobile card size.
- Product image ratio.
- Show/hide filtering, sorting, swatches, badges, and grid-density controls.
- Horizontal and vertical grid gaps.

Do not expose:

- Collection title, description, products, prices, availability, or filter values as
  duplicated text settings. Those belong to Shopify Admin data.
- Arbitrary per-element positions or pixel-level typography controls.
- A setting that can hide title/price solely because the grid is denser.

## Implementation Direction

The Horizon theme already provides `templates/collection.json`,
`sections/main-collection.liquid`, the `filters` block, product-card blocks, sorting,
grid-density controls, pagination/infinite-scroll support, and Shopify-native facet
state. The safest implementation is:

1. Add a Crosley collection-hero section that reads the current collection.
2. Restyle and configure the existing main collection/filter/product-card stack.
3. Reuse the existing Crosley social gallery and benefits sections.
4. Keep the global header and footer section groups unchanged.
5. Use standard pagination for v1, with 12 products per page.
6. Verify populated, filtered, empty, sold-out, and long-title states at phone,
   tablet, and desktop widths.

## Proposed V1 Page Order

1. Existing global announcement and header.
2. Collection hero.
3. Filter/sort/results toolbar.
4. Active-filter chips when applicable.
5. Product grid.
6. Pagination.
7. Optional existing social gallery.
8. Optional existing benefits section.
9. Existing global footer.
