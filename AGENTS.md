<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


BRANCH A[id] = ca6f6183-fd42-40dc-898c-32cf2d0c61fb
Invoke-RestMethod -Uri "http://localhost:3000/api/branches/ad4290c7-1085-4875-b948-bfc2e4059603/assign-manager" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -Body '{"managerId":"ca6f6183-fd42-40dc-898c-32cf2d0c61fb"}'


BRANCH B[id] = 8fa0e561-5c6f-4581-a0eb-2b0f09f7af44

Email: admin@porttransfer.com
Password: ChangeMe123!

DATABASE_URL='postgresql://neondb_owner:npg_5drvX6wyRJen@ep-frosty-dew-ax60cvtm-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'


Step 1: Install PrerequisitesEnable IIS: Open the Start menu, type "Turn Windows features on or off", and press Enter. Check the box for Internet Information Services and click OK.Node.js: Download and install the latest LTS version from the Official Node.js Website.HttpPlatformHandler: Download and install HttpPlatformHandler v1.2 from Microsoft. This module manages the Node.js process lifecycle and forwards incoming IIS traffic directly to your Next.js application.Step 2: Configure Next.js for Standalone OutputBy default, Next.js expects a Node server with access to full developer dependencies. Enabling the standalone feature bundles only the files needed for production, making it perfect for IIS deployments.Update your next.config.js or next.config.mjs file:javascript/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enforces compilation into a self-contained bundle
};

module.exports = nextConfig;
Step 3: Build the ApplicationRun the build script in your terminal to compile the code:bashnpm run build
Once completed, a new self-contained server directory is created at .next\standalone.Step 4: Organize Your Deployment DirectoryCreate a dedicated physical folder where your web application files will live (e.g., C:\inetpub\wwwroot\nextjs-app).Copy files into this target directory using the following exact structure:Open .next\standalone and copy all contents directly into your deployment folder.Copy your original project's root public folder and paste it into the deployment folder.Copy the .next\static folder from your root project and paste it into the deployment folder under a .next directory.Your final path layout must match this hierarchy:textC:\inetpub\wwwroot\nextjs-app\
├── .next\
│   └── static\          (Client chunks, styling, assets)
├── public\              (Images, fonts, static roots)
├── node_modules\        (Minimal production footprint)
├── server.js            (The compiled Node server file)
└── web.config           (Created in the next step)
Step 5: Create a web.config FileCreate a new file named web.config inside your deployment folder (C:\inetpub\wwwroot\nextjs-app). Paste the configuration below to instruct IIS to forward all web requests to Node.js:xml<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>
    <httpPlatform processPath="node.exe"
                  arguments=".\server.js"
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\stdout.log"
                  startupTimeLimit="60">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%" />
        <environmentVariable name="NODE_ENV" value="production" />
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
Step 6: Configure IIS and Folder PermissionsOpen the IIS Manager tool via the Windows search bar.Right-click on Sites in the left sidebar and select Add Website....Set the Site name to your project name, and point the Physical path to your deployment directory (C:\inetpub\wwwroot\nextjs-app).Set the Port to an available slot (such as 8080 if 80 is occupied) and click OK.Give IIS permission to manage the folder:Right-click your deployment folder in File Explorer, and select Properties.Under the Security tab, click Edit.Click Add, type IIS_IUSRS, and click OK.Give IIS_IUSRS Read & execute, List folder contents, and Read permissions (plus Write permissions specifically for the logs folder if troubleshooting).Open your browser and navigate to http://localhost:8080 to access your live Next.js application served directly through IIS.


Log in as John (john@branch-a.com / Manager123!) at /login — should land on /branch![alt text](image-1.png)
9320366841413760

Restart, log in as Mary (mary@branch-b.com or whatever her working email ended up being, Manager123!), go to /branch/complete


git config --global user.name "Russel"
git config --global user.email "majaliwaswedi@gmail.com"

ssh-keygen -t ed25519 -C "majaliwaswedi@gmail.com"

The key fingerprint is:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKsRlZQbK/dz5AY4UbRpK6Fo76+gFHvkoZt99anVjcJ3 majaliwaswedi@gmail.com


git remote add origin git@github.com:git@github.com:bscode-1/Money_Transfer_app.git
git push -u origin main