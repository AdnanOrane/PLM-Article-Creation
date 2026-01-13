# Contributing to PLM Article Creation Extension

Welcome to the team! To ensure a smooth workflow and maintain code quality, please follow these guidelines when contributing to this project.

## Getting Started

New to the project? Follow these steps to get your development environment set up:

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Run the application**:

    ```bash
    npm start
    ```

    This will start a local server and open the application in your default browser.

    > **Note**: If you need to run with a local configuration (e.g., usually for mocking backend data), use:
    >
    > ```bash
    > npm run start-local
    > ```

## Branching Strategy

We use a simplified workflow centered around a **development branch (`dev`)**.

- **`main`**: This branch contains the stable, production-ready code. **Do not push directly to main.**
- **`dev`**: This is our main integration branch. All feature development starts and ends here.
- **Feature Branches**: Create a new branch for every feature or bug fix.

### Naming Conventions

- Features: `feature/your-feature-name`
- Bug Fixes: `fix/bug-description`
- Documentation: `docs/update-readme`

## Workflow

1.  **Checkout the `dev` branch** and pull the latest changes:

    ```bash
    git checkout dev
    git pull origin dev
    ```

2.  **Create a new branch** for your work:

    ```bash
    git checkout -b feature/my-new-feature
    ```

3.  **Make your changes** and commit them with clear, descriptive messages.

4.  **Push your branch** to the repository:

    ```bash
    git push origin feature/my-new-feature
    ```

5.  **Create a Pull Request (PR)**:

    When you are ready to submit your changes, follow these steps:

    - Go to the repository on GitHub.
    - Click the **"Pull requests"** tab and then **"New pull request"**.
    - **Crucial Step**: Change the "base" branch to **`dev`**. Do NOT target `main`.
    - Select your feature branch as the "compare" branch.
    - Give your PR a clear title and helpful description explaining your changes.
    - Request a review from a team member on the right sidebar.

6.  **Merge Process**:

    - **Wait for Review**: A team member will review your code. Address any feedback they provide.
    - **Approval**: Once the reviewer approves your PR, it is ready to be merged.
    - **Merging**: Typically, a project maintainer will perform the merge into `dev`.
    - **Delete Branch**: After a successful merge, you can safely delete your feature branch.

## Coding Standards

- **JavaScript**: Follow standard UI5 best practices. Use `sap.ui.define` for modules.
- **Views**: Use XML views and fragments.
- **Formatting**: Ensure code is formatted before committing (use Prettier/ESLint if available).

## Project Structure

- `webapp/ext`: Place all controller and fragment extensions here.
- `webapp/i18n`: Add new texts to the message bundle; avoid hardcoding strings.

Happy Coding!
