# Task: Audit the Entire Project and Push the Correct Files to GitHub

You are working on the **Gulistan Marriage Bureau** project. I want you to independently inspect the entire project, determine which files should and should not be committed to GitHub, prepare the repository properly, and push the appropriate files to the configured GitHub repository.

I do not want to manually select files. You are responsible for auditing the project and making appropriate decisions based on its actual structure, technologies, dependencies, and requirements.

## 1. Inspect the Entire Project

Before making changes:

- Inspect the complete project directory, including source code, configuration files, assets, documentation, generated files, and existing Git configuration.
- Read the README and relevant project documentation.
- Identify the technology stack, build system, package manager, and required runtime configuration.
- Inspect the current Git status, current branch, remotes, recent commits, `.gitignore`, and existing tracked files.
- Identify whether a Git repository and GitHub remote already exist.
- Check whether the project builds or runs successfully, if practical, without modifying unrelated functionality.
- Inspect all folders, including any `frames` folder or archive containing high-quality animation frames.

Do not assume that a file should be committed simply because it exists in the project directory.

## 2. Decide What Belongs on GitHub

**Commit files required to develop, build, test, configure, document, and deploy the project**, including as applicable:

- Application source code and components.
- Required dependency manifests and lockfiles.
- Build and development configuration.
- Database schemas, migrations, and safe seed data.
- Tests and development scripts.
- README and relevant documentation.
- Necessary logos, icons, fonts, images, and other application assets.
- Required deployment configuration and environment-variable examples without real secrets.

Exclude files that should not be version-controlled, including as applicable:

- `node_modules`, virtual environments, and dependency caches.
- Build output and generated artifacts that can be recreated.
- Logs, temporary files, editor caches, and operating-system files.
- Local environment files such as `.env` containing secrets.
- API keys, passwords, tokens, private certificates, and other credentials.
- Private user data, customer records, database dumps, and sensitive uploaded files.
- Unnecessary duplicate assets and large generated files that are not required by the application.

Adapt these rules to the actual stack. Do not blindly delete or exclude files that the application needs.

## 3. Specifically Audit the Frames Folder

Inspect the frames folder and the archive `Gulistan_frames_30fps_high_quality.zip`, if available in the project.

Determine:

- What the frames are used for.
- Whether the application actually references them.
- Whether they are required at runtime, during development, or only for generating an animation.
- The number of frames, total size, individual file sizes, and whether duplicates or unnecessary generated files exist.
- Whether the animation can use a more efficient format, such as WebP, an optimized image sequence, or video, without breaking the intended experience.

Then choose the appropriate strategy:

- Commit necessary, reasonably sized application assets.
- Keep only selected frames if the project genuinely needs a subset.
- Exclude temporary or reproducible frames.
- For essential large assets, evaluate Git LFS or suitable external asset storage, considering repository requirements, quotas, and deployment compatibility.

Do not upload every frame automatically. Do not remove or convert assets in a way that breaks the application. Preserve original files unless a safe, verified replacement strategy is established.

## 4. Configure `.gitignore`

Review and update the root `.gitignore`, plus any relevant nested ignore rules, for this project's actual stack.

Ensure it excludes secrets, local development files, caches, temporary files, and reproducible build outputs while allowing required source files and assets.

Check whether any files that should be ignored are already tracked. Remember that adding a pattern to `.gitignore` does not remove a file from Git tracking.

Do not commit real `.env` files or credentials. If secrets are discovered in existing Git history, do not assume removing them from the latest commit is sufficient; report the exposure and recommend the appropriate cleanup and credential rotation.

## 5. Review Large Files and Repository Health

Before staging:

- Identify files that are unusually large and review whether they genuinely belong in Git.
- Check for accidental nested repositories, archives, duplicate assets, generated binaries, and unrelated files.
- Inspect GitHub's applicable file-size limits and any relevant Git LFS requirements.
- Avoid adding the entire workspace indiscriminately.
- Do not rewrite existing Git history or delete project files just to reduce repository size.
- Do not stage unrelated user changes or overwrite existing work.

If an essential asset is too large for an ordinary Git commit, choose an appropriate supported storage approach or explain the blocker before proceeding.

## 6. Verify Before Committing

Before committing anything:

- Review the staged file list and the complete diff.
- Confirm that secrets, credentials, private data, and unnecessary generated files are not staged.
- Confirm that required source code, configuration, documentation, and assets are included.
- Check that `.gitignore` works as intended.
- Run relevant tests, linting, or a production build when practical.
- Verify that required files have not accidentally been excluded.

If the project is already under Git version control, preserve its existing history and branch conventions. Avoid force-pushing, destructive resets, or history rewrites.

## 7. Commit and Push to GitHub

If the audit passes:

1. Stage only the appropriate project files.
2. Create a clear commit message, such as `chore: prepare project for GitHub`.
3. Push to the existing configured GitHub remote and the appropriate branch.
4. Preserve existing remote changes. If the remote has commits not present locally, inspect and integrate them safely instead of overwriting them.
5. Verify that the push succeeds and that the intended commit and files are present on the remote.

Use the existing authenticated GitHub integration or Git credentials if available. Never print, expose, or commit authentication tokens.

If no remote is configured, authentication is unavailable, a merge conflict occurs, or another issue prevents a safe push, do not invent a repository URL or bypass safeguards. Complete the safe preparation work and tell me exactly what information or action is needed.

## 8. Final Report

When finished, provide a concise report covering:

- The detected project stack and repository status.
- The GitHub repository and branch used.
- The categories of files included and excluded.
- The frames-folder decision and its reason.
- Any `.gitignore` changes.
- The tests or build checks performed and their results.
- The commit hash and push status, if successful.
- Any unresolved issues or recommended follow-up actions.

**Important:** Work autonomously where it is safe, but never sacrifice project integrity or security just to complete the push. Inspect first, decide based on evidence, verify the staged changes, and only then commit and push. Do not claim success unless you have verified it.


**GitHub Repository:** `Gulistan-Marriage-Bureau`

Use the existing GitHub repository named `Gulistan-Marriage-Bureau`. First inspect the configured Git remote and verify that it points to the correct repository. Preserve the existing commit history, branch, and remote changes.

Do not create a new repository. If the remote is missing or does not point to the correct repository, stop before pushing and ask me for the repository URL.

After auditing the entire project, update `.gitignore` as needed, stage only appropriate files, verify that no secrets or unnecessary generated assets are included, commit the changes, and push to the correct branch. Finally, report the repository URL, branch, commit hash, files included or excluded, frames-folder decision, and push status.