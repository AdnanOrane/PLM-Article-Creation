# Contributing to PLM Article Creation Extension

Welcome to the team! To ensure a smooth workflow and maintain code quality, please follow these guidelines when contributing to this project.

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

    - Target the **`dev`** branch (NOT `main`).
    - Add a description of your changes.
    - Request a review from a team member.

6.  **Merge**: Once approved, your code will be merged into `dev`.

## Coding Standards

- **JavaScript**: Follow standard UI5 best practices. Use `sap.ui.define` for modules.
- **Views**: Use XML views and fragments.
- **Formatting**: Ensure code is formatted before committing (use Prettier/ESLint if available).

## Project Structure

- `webapp/ext`: Place all controller and fragment extensions here.
- `webapp/i18n`: Add new texts to the message bundle; avoid hardcoding strings.

Happy Coding!
