# PLM Article Creation Extension (`com.zmanprodlist`)

## Project Overview

This project is a **SAP Fiori Elements** extension application designed for **PLM Article Creation**. It extends the standard capabilities to provide a tailored user experience, specifically focusing on managing product characteristics and handling complex authorization logic for various style creation functionalities.

**App ID**: `com.zmanprodlist`

## Key Features

### 1. Dynamic Characteristics / Attributes Section

A custom section requires to be added to the Object Page to handle product attributes dynamically.

- **Dynamic Rendering**: The application dynamically renders input fields throughout the "Attributes" section based on the configuration fetched from `ZOD_MM_CLASSIF_CREATE_SRV`.
- **Value Help Integration**: Supports value help requests for generic inputs, ensuring data consistency.
- **Data Persistence**: seamless integration for saving and updating characteristic values.
- **Logic Location**: `webapp/ext/controller/Classification.controller.js` & `webapp/ext/fragment/Classification.fragment.xml`.

### 2. Advanced Authorization Management based on User Validation

The application implements robust logic to enable or disable specific functionalities in the List Report based on the user's authorization level.

- **Service-Driven Auth**: Access rights are determined by the `/userValidationSet` from the `ZOD_MM_CLASSIF_CREATE_SRV` service.
- **Action Control**: standard and custom actions are dynamically hidden or shown based on the `ActionAuth` property (e.g., `CREATE`, `DELETE`, `SMU`, `ONL`, `COPY`, `REPI`, `REPA`, `DSAP`, `HOIN`, `HOAP`).
- **Logic Location**: `webapp/ext/controller/ListManProduct.controller.js`.

## Technical Architecture

### Frameworks & Tools

- **SAPUI5** (Fiori Elements)
- **OData V4** (Main Data Source)
- **OData V2** (Classification & Validation Services)

### OData Services

1.  **Main Service**: `ZSD_MAN_PRODUCT` (V4)
    - URI: `/sap/opu/odata4/sap/zui_man_product/srvd/sap/zsd_man_product/0001/`
    - Used for the main application data (Products, Variants, Seasons, etc.).
2.  **Classification Service**: `ZOD_MM_CLASSIF_CREATE_SRV` (V2)
    - URI: `/sap/opu/odata/sap/ZOD_MM_CLASSIF_CREATE_SRV`
    - Used for fetching dynamic attributes, values, and user authorizations.

### Key Extensions

- **List Report Controller**: `com.zmanprodlist.ext.controller.ListManProduct`
  - Handles `onInit` and `onAfterBinding` to fetch authorizations and toggle action visibility.
- **Object Page Controller**: `com.zmanprodlist.ext.controller.Classification`
  - Manages the "Attributes" custom section, including fetching characteristics, rendering the form, handling value help, and saving data.

## Setup and Installation

### Prerequisites

- Node.js (Latest LTS version recommended)
- UI5 CLI (`npm install --global @ui5/cli`)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

To run the application locally with the mock server or connecting to a remote system (requires configuration):

```bash
# Start the application
npm start

# Start with local configuration
npm run start-local
```

### Building

To build the application for deployment:

```bash
npm run build
```

## Directory Structure

- `webapp/`: Source code of the application.
  - `ext/`: Extensions (Controllers, Fragments).
  - `localService/`: Mock data and metadata.
  - `i18n/`: Internationalization files.
- `ui5.yaml`: UI5 tooling configuration.

## Documentation

Detailed technical documentation for custom features lives in the [`docs/`](./docs/) folder.

| Document | Description |
|---|---|
| [Profile Completeness Widget](./docs/profile-completeness-widget.md) | How the Style Readiness chart works — all sections, calculation strategies, data sources, CSS classes, and how to add new sections |
