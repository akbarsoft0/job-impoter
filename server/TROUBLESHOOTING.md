# MongoDB Connection Troubleshooting

## Common Issues and Solutions

### 1. Connection String Format Error

**Error:** `querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net`

**Problem:** Your MongoDB connection string has an incomplete cluster hostname.

**Solution:**
1. Go to MongoDB Atlas → Clusters → Connect → Connect your application
2. Copy the connection string - it should look like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority
   ```
   Notice: `cluster0.xxxxx.mongodb.net` (not just `cluster.mongodb.net`)

3. Replace the placeholder values:
   - Replace `<username>` with your MongoDB username
   - Replace `<password>` with your MongoDB password
   - Replace `database` with your database name (e.g., `job_import`)

### 2. Environment Variable Not Set

**Error:** `MONGO_URI environment variable is not set`

**Solution:**
1. Create a `.env` file in the `server` directory
2. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```
3. Add your MongoDB connection string:
   ```env
   MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/job_import?retryWrites=true&w=majority
   ```

### 3. IP Whitelist Error

**Error:** Connection timeout or authentication failed

**Solution:**
1. Go to MongoDB Atlas → Network Access → IP Access List
2. Add your current IP address OR
3. Add `0.0.0.0/0` (allows all IPs - use only for development!)

### 4. Authentication Failed

**Error:** `authentication failed`

**Solution:**
1. Verify your username and password in the connection string
2. Check MongoDB Atlas → Database Access → verify user exists
3. Ensure the user has proper permissions

### 5. Network/DNS Issues

**Error:** `ENOTFOUND` or connection timeout

**Solution:**
1. Check your internet connection
2. Verify the cluster hostname is correct
3. Try using the regular `mongodb://` connection string instead of `mongodb+srv://`
4. Check if your firewall is blocking the connection

## Step-by-Step Setup

### 1. Get Your MongoDB Connection String

1. Log in to MongoDB Atlas
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string

### 2. Create .env File

```bash
cd server
cp env.example .env
```

### 3. Update .env File

Edit `.env` and add your MongoDB connection string:

```env
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/job_import?retryWrites=true&w=majority
```

**Important:** Replace all placeholder values with your actual credentials.

### 4. Test Connection

```bash
npm run dev
```

You should see: "Successfully connected to MongoDB"

## Example Connection String Formats

### MongoDB Atlas (Recommended)
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/job_import?retryWrites=true&w=majority
```

### Local MongoDB
```
mongodb://localhost:27017/job_import
```

### MongoDB with IP Address
```
mongodb://username:password@192.168.1.100:27017/job_import
```

## Security Notes

⚠️ **NEVER commit your `.env` file to Git!**

- The `.env` file is in `.gitignore`
- Use `env.example` for documentation
- Never hardcode credentials in source code
- Use environment variables in production
