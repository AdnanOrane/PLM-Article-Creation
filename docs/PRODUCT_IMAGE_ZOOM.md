# Product Image Zoom Feature

## Overview (Layman's Terms)
When users view a product in the application, they can click on the product's image to open a larger view in a popup window. Similar to shopping on e-commerce sites like Amazon, hovering the mouse over the image automatically triggers a high-detail "magnifying glass" effect. 

A magnified version of exactly what the mouse is pointing at appears on the right half of the screen. As users move their mouse across the original image, the right panel follows along perfectly in real-time. We also added a settings slider at the top to let users choose exactly how close they want to zoom in (e.g., 2 times closer, 3 times closer).

## Technical Implementation Details
The zoom architecture replaces the default static `sap.m.LightBox` with a custom dual-pane UI5 layout. 

### 1. The Layout (`ZoomDialog.fragment.xml`)
The dialog creates an `sap.m.HBox` layout container divided exactly 50/50:
- **Left Pane:** Displays the standard-sized image.
- **Right Pane:** Houses the "lens view". The right image is rendered as a raw CSS Background (`mode="Background"`), which allows us to natively shift the background coordinates at high speeds rather than physically transforming or dragging a giant image element across the screen.

### 2. High-Fidelity Mouse Tracking (`ObjectPageExt.controller.js`)
To circumvent SAPUI5's internal event-throttling (which often strips out high-frequency events like `mousemove` from non-interactive components to save browser memory), the zoom tracking purposefully bypasses the XML-based Event Delegates.

Instead, the logic binds to the SAPUI5 `onAfterRendering` lifecycle hook. This fires perfectly when the dialog finishes compiling onto the screen. It then grabs the physical HTML DOM Node and attaches a **native browser DOM `addEventListener`** for `mousemove` directly onto the left image.

### 3. Coordinate Translation Algorithm
When the `mousemove` event fires:
1. The script extracts the exact raw `clientX` and `clientY` coordinates of the user's cursor.
2. It calculates where the mouse is relative to the absolute boundaries of the left image using `getBoundingClientRect()`.
3. These raw pixel offsets are mathmatically normalized into scalable `0%` to `100%` percentages.
4. The percentages are immediately piped into the right image's inline CSS `style.backgroundPosition`, ensuring the magnification shifts flawlessly with the user's physical movement.
5. The zoom multiplier slider simply intercepts the magnification logic and modifies the right side's CSS `backgroundSize` property (e.g., from `100% 100%` up to `500% 500%`).

### 4. Preventing Layout Glitches
In standard Fiori implementations, attempting to hide the right pane using SAPUI5's `setVisible(false)` will completely delete it from the browser's Document Object Model. This triggered a severe layout shift error: the browser would recenter the left image causing it to slide away from the user's mouse pointer, creating an infinite flickering bug. 

The successful fix dictates that both panes are ALWAYS drawn into the `<HBox>` layout to reserve their 50% structural width blocks, and visibility is managed exclusively by swapping inline CSS transparency values (`opacity: 0` vs `opacity: 1`) via JavaScript.
