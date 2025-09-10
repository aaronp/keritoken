# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment of the Bond Auction Platform.

## Workflows

### 🚀 deploy-all.yml (Main Workflow)
**Purpose**: Deploys both the UI application and documentation to GitHub Pages

**Triggers**:
- Push to `main` or `master` branch
- Changes to `ui/issuer/**`, `docs/**`, or workflow file
- Manual trigger via workflow dispatch

**What it does**:
1. Builds the React UI application
2. Builds the Slidev documentation
3. Combines both into a single deployment:
   - UI app at root (`/`)
   - Documentation at `/docs/`
4. Creates a landing page with links to both
5. Deploys everything to GitHub Pages

**URLs after deployment**:
- Landing: `https://[username].github.io/[repo]/landing.html`
- UI App: `https://[username].github.io/[repo]/`
- Docs: `https://[username].github.io/[repo]/docs/`

### 📚 deploy-slides.yml (Legacy - Disabled)
**Purpose**: Originally for deploying only documentation (now disabled)
- Kept for reference but superseded by `deploy-all.yml`
- Can still be triggered manually if needed

## Setup Instructions

### 1. Enable GitHub Pages
1. Go to repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save the settings

### 2. Verify Base Paths
The workflows automatically set the correct base paths for your repository.
If your repo is named differently, the paths will adjust accordingly.

### 3. First Deployment
1. Make any small change to trigger the workflow
2. Or go to Actions tab → Select workflow → Run workflow
3. Wait for deployment to complete
4. Check the Actions tab for the deployment URL

## Local Testing

To test the GitHub Pages build locally:

```bash
# Use the provided build script
./build-for-pages.sh

# Or manually:
cd deploy
python3 -m http.server 8000
# Visit http://localhost:8000/
```

## File Structure After Deployment

```
GitHub Pages Root
├── index.html          # UI application
├── landing.html        # Landing page with links
├── assets/            # UI assets
├── contracts/         # Contract ABIs
├── docs/              # Documentation
│   ├── index.html     # Slidev presentation
│   └── assets/        # Slide assets
└── [other UI files]
```

## Customization

### Changing Repository Name
If your repository name changes, update:
1. Nothing! The workflows use `${{ github.event.repository.name }}` automatically

### Adding More Build Steps
Edit `.github/workflows/deploy-all.yml` to add:
- Additional build steps
- Environment variables
- Different Node versions
- Other static assets

### Separate Deployments
If you need to deploy UI and docs separately:
1. Re-enable `deploy-slides.yml`
2. Create a separate `deploy-ui.yml`
3. Use different branches or deployment environments

## Troubleshooting

### Build Fails
- Check Node version compatibility (using Node 20)
- Ensure `package-lock.json` files are committed
- Verify all dependencies are listed in `package.json`

### 404 Errors
- Wait 5-10 minutes for GitHub Pages to propagate
- Check that base paths are correct in build output
- Verify the repository has GitHub Pages enabled

### Wrong Base Path
- The workflow automatically uses your repository name
- For custom domains, modify the base path in the workflow

## Environment Variables

The workflows set these automatically:
- Base path for UI: `/${{ github.event.repository.name }}/`
- Base path for docs: `/${{ github.event.repository.name }}/docs/`

## Security

- Workflows have minimal required permissions
- Uses `contents: read` for code access
- Uses `pages: write` and `id-token: write` for deployment
- No secrets or sensitive data in workflows