# PUrge BPHC - Development & Deployment Guide

This guide contains four main sections:
1.  **First-Time Firebase Setup:** One-time setup for your Firebase project in the console.
2.  **Resolving Connection Errors After a Billing Issue:** A critical troubleshooting step if you've had a billing account deactivated.
3.  **Local Testing & Version Control:** How to run the app in a cloud environment and track code changes.
4.  **Public Deployment:** How to make your app live on the internet.

---

### ✅ Section 1: First-Time Firebase Setup (Crucial)

Before running the application for the first time, you must activate the Firestore database in your Firebase project. This is a **one-time setup**.

**1. Go to the Firebase Console:**
*   Open your web browser and navigate to the [Firebase Console](https://console.firebase.google.com/).
*   Select the Firebase project you are using for this application.

**2. Create the Firestore Database:**
*   In the left-hand navigation menu, under the "Build" section, click on **Firestore Database**.
*   Click the **"Create database"** button.
*   A wizard will appear. For the first step, "Secure your data", select **"Start in production mode"**. Click **Next**.
*   For the second step, "Set up the location", choose a Firestore location. The one closest to your users is usually best (e.g., `asia-south1` for India). Click **Enable**.

It will take a minute or two for the database to be provisioned. Once this is done, you can proceed with the rest of the setup. Your application will now be able to connect to the database.

---

### ✅ Section 2: Resolving Connection Errors After a Billing Issue

If your Firebase project is on a paid plan and your billing account was ever deactivated and then reactivated, you may see a "Could not connect to the database" error. This happens because Google Cloud disables the underlying APIs, and they are often **not** re-enabled automatically.

Follow these steps to fix it:

**1. Go to the Google Cloud Console API Library:**
*   Make sure you are logged in with the same Google account associated with your Firebase project.
*   Open this direct link: [https://console.cloud.google.com/apis/library/firestore.googleapis.com](https://console.cloud.google.com/apis/library/firestore.googleapis.com)

**2. Select Your Project:**
*   At the top of the page, you'll see a project dropdown menu. Make sure it shows the name of your Firebase project (e.g., "purge-bphc-12345"). If not, click it and select the correct project.

**3. Enable the API:**
*   The page will be for the "Cloud Firestore API". You will likely see a blue **"Enable"** button.
*   **Click the "Enable" button.**
*   It may take a minute or two to process. Once it is enabled, the button will change to a gray "Manage" button.

**4. Restart Your Application:**
*   Once the API is enabled, restart your application (or simply try logging in again). The connection error should now be resolved.

---

### ✅ Section 3: Run, Test, and Track Your Code (Cloud Workflow)

This entire workflow uses a browser and a cloud-based terminal, so you do not need to install anything on your local computer.

#### 3.1: Open the Google Cloud Shell

*   Go to the [Google Cloud Console](https://console.cloud.google.com/).
*   Make sure your project is selected at the top.
*   Click the **"Activate Cloud Shell"** icon in the top-right corner of the header. It looks like a terminal prompt `>_`. This will open a terminal session at the bottom of your browser.

#### 3.2: Get Your Code

*   **First time? Clone from GitHub:** If your code is on GitHub, you'll need to clone it. Run this command in the Cloud Shell, replacing the URL with your repository's URL:
    ```bash
    git clone https://github.com/YourUsername/your-repo-name.git
    cd your-repo-name
    ```
*   **Already cloned? Pull the latest:** If you've already cloned the repo in a previous session, just navigate to the folder and pull the latest changes:
    ```bash
    cd your-repo-name
    git pull
    ```

#### 3.3: Install Dependencies & Run the App

*   Run this command to install all necessary packages for the web app and the backend functions:
    ```bash
    npm install && (cd functions && npm install)
    ```
*   To start the development server for testing, run:
    ```bash
    npm run dev
    ```
*   The terminal will show that the server is ready. Click the **"Web Preview"** button (it looks like a box with an arrow) in the Cloud Shell toolbar.
*   Select **"Preview on port 9002"**. A new browser tab will open with your running application, allowing you to test it live.

#### 3.4: Track Your Code with Git & GitHub (Version Control)

Git is a tool that tracks the history of your code. GitHub is a website that stores your code remotely. This is essential for backup, collaboration, and automatic deployments.

*   As you make changes, you need to save them. This is a two-step "commit" process.
    ```bash
    # Step 1: Add all modified files to the "staging area" (the '.' means all files)
    git add .

    # Step 2: Save the staged files with a descriptive message
    git commit -m "Add new background style and update readme"
    ```
*   To push your saved changes to GitHub, run:
    ```bash
    git push
    ```

---

### 🚀 Section 4: Deploy Your Application to the Web (Go Live)

This section covers deploying your frontend (the Next.js app) and your backend (the Firebase Functions for notifications).

#### 4.1: Deploying Firebase Functions (The "Sender")

This is a **critical step** to make push notifications work. These functions run on Google's servers and send notifications when database events occur. You only need to run this command when you change the code inside the `functions/src` directory.

1.  **Open Your Cloud Shell** and navigate to your project directory.
2.  **Log In to Firebase (if needed):**
    ```bash
    firebase login
    ```
3.  **Deploy the Functions:** Run the following command. This specifically finds the code in the `functions` directory, builds it, and sends it to Firebase.
    ```bash
    firebase deploy --only functions
    ```
    After the command finishes, your backend notification logic will be live.

#### 4.2: Deploying the Web App (The "Receiver")

This is the final step to make your application live on a public URL. The recommended approach is to connect your GitHub repository to a hosting provider like **Vercel** or **Firebase Hosting**.

**Recommended: Deploying with Vercel**

Vercel is designed for Next.js and makes deployment incredibly simple.

1.  **Push your code to GitHub** by following the steps in Section 3.
2.  Go to [Vercel.com](https://vercel.com) and sign up with your GitHub account.
3.  Click "Add New... -> Project" from your Vercel dashboard.
4.  Select your GitHub repository for this project.
5.  Vercel will automatically detect it's a Next.js app. You will need to configure your **Environment Variables** (like your Firebase and Gemini API keys) in the project settings on Vercel.
6.  Click **"Deploy"**.

**The Magic of Automatic Deployments:** Once set up, Vercel will automatically redeploy your website every time you `git push` a new commit to your `main` branch on GitHub.
