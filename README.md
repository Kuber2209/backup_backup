
# PUrge BPHC - Development & Deployment Guide

This guide contains four main sections:
1.  **First-Time Firebase Setup:** One-time setup for your Firebase project in the console.
2.  **Local Testing:** How to run the app on your computer for testing before deployment.
3.  **Version Control with Git:** How to track changes to your code locally and push them to GitHub.
4.  **Public Deployment:** How to make your app live on the internet using services like Vercel or Firebase.

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

### ✅ Section 2: Run and Test Locally on Your Network (Pre-Deployment)

Follow these steps to run the application on your computer. This is perfect for testing on your phone, tablet, or other computers without making the site public.

**1. Download Your Project Code:**
*   Click the "Download code" button in Firebase Studio to get the project as a ZIP file.
*   Unzip the file on your computer.

**2. Install Prerequisites:**
*   **Node.js:** If you don't have it, [download and install it from the official website](https://nodejs.org/). This also installs `npm`.
*   **Firebase CLI:** You'll need this for deploying backend functions. Install it globally by running:
    ```bash
    npm install -g firebase-tools
    ```

**3. Install Project Dependencies:**
*   Open a terminal (Command Prompt, PowerShell, or Terminal on Mac).
*   Navigate into the project folder you unzipped using the `cd` command. For example:
    ```bash
    # Replace 'your-project-folder-name' with the actual folder name
    cd C:\Users\YourName\Desktop\your-project-folder-name
    ```
*   Once inside the folder, run this command to install all the necessary packages for both the web app and the backend functions:
    ```bash
    npm install && (cd functions && npm install)
    ```

**4. Start the Local Development Server:**
*   In the same terminal, run the following command:
    ```bash
    npm run dev
    ```
*   The terminal will show you that the server is running. It will look something like this:
    ```
    ✓ Ready in 1.2s
    - Local:        http://localhost:9002
    - Network:      http://192.168.1.10:9002
    ```

**5. Access From Other Devices:**
*   Ensure your computer and your other devices (phone, tablet) are connected to the **SAME Wi-Fi network**.
*   On your phone or tablet, open a web browser and type in the **Network URL** provided by the terminal (e.g., `http://192.168.1.10:9002`).
*   The web app will now load on your device, and you can test it directly! Any changes you make in the code editor and apply will update live.

---

### 📚 Section 3: Track Your Code with Git & GitHub (Version Control)

Git is a tool that tracks the history of your code. GitHub is a website that stores your code remotely. This is essential for backup, collaboration, and automatic deployments.

#### 3.1: Saving Changes Locally

**1. Navigate to your project folder:**
*   Open your terminal and use the `cd` command to go into your project's main folder.

**2. Initialize Git (only do this once per project):**
*   If you haven't already, run this command to start tracking your project:
    ```bash
    git init
    ```

**3. Save your versions (Commit):**
*   As you make changes, you need to save them. This is a two-step "commit" process.
    ```bash
    # Step 1: Add all modified files to the "staging area" (the '.' means all files)
    git add .

    # Step 2: Save the staged files with a descriptive message
    git commit -m "Add new background style and update readme"
    ```
*   You can run these two commands as many times as you want to save different versions of your project.

#### 3.2: Pushing to GitHub

This sends your saved local commits to your central repository on GitHub.

**1. Create a Repository on GitHub:**
*   Go to [GitHub.com](https://github.com) and create a new, **empty** repository (do not initialize it with a README or license file).
*   After creating it, GitHub will show you a page with a URL. Copy the HTTPS URL, which looks like this: `https://github.com/YourUsername/Your-Repo-Name.git`.

**2. Link Your Local Project to GitHub (only do this once):**
*   In your terminal (inside your project folder), run this command, replacing the URL with the one you copied:
    ```bash
    git remote add origin https://github.com/YourUsername/Your-Repo-Name.git
    ```
*   Then, ensure your main branch is named `main`:
    ```bash
    git branch -M main
    ```

**3. Push Your Code:**
*   To push your code for the first time, run this command:
    ```bash
    git push -u origin main
    ```
*   From now on, after you commit new changes locally (`git add .` and `git commit`), you can simply run the following command to update your GitHub repository:
    ```bash
    git push
    ```

---

### 🚀 Section 4: Deploy Your Application to the Web (Go Live)

This section covers deploying your frontend (the Next.js app) and your backend (the Firebase Functions for notifications).

#### 4.1: Deploying Firebase Functions (The "Sender")

This is a **critical step** to make push notifications work. These functions run on Google's servers and send notifications when database events occur.

1.  **Open Your Terminal:** Use a terminal on your local machine or a cloud environment like Google Cloud Shell.
2.  **Navigate to Project Directory:** Use the `cd` command to go into your project's main folder.
3.  **Log In to Firebase:**
    ```bash
    firebase login
    ```
    This will open a browser window for you to log in to your Google account.
4.  **Select Your Firebase Project:** If you have multiple Firebase projects, you may need to select the correct one. You can use `firebase projects:list` to see available projects and `firebase use <your-project-id>` to select one.
5.  **Deploy the Functions:** Run the following command. This specifically finds the code in the `functions` directory, builds it, and sends it to Firebase.
    ```bash
    firebase deploy --only functions
    ```
    After the command finishes, your backend notification logic will be live. You only need to re-run this command when you make changes to the files inside the `functions/src` directory.

#### 4.2: Deploying the Web App (The "Receiver")

This is the final step to make your application live on a public URL. The recommended approach is to connect your GitHub repository to a hosting provider like **Vercel** or **Firebase Hosting**.

**Recommended: Deploying with Vercel**

Vercel is designed for Next.js and makes deployment incredibly simple.

1.  **Push your code to GitHub** by following the steps in Section 3.
2.  Go to [Vercel.com](https://vercel.com) and sign up with your GitHub account.
3.  Click "Add New... -> Project" from your Vercel dashboard.
4.  Select your GitHub repository for this project.
5.  Vercel will automatically detect it's a Next.js app. You may need to configure your **Environment Variables** (like your Firebase and Gemini API keys) in the project settings on Vercel.
6.  Click **"Deploy"**.

**The Magic of Automatic Deployments:** Once set up, Vercel will automatically redeploy your website every time you `git push` a new commit to your `main` branch on GitHub.
