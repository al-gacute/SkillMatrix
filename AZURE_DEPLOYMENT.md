# SkillMatrix Azure Deployment Guide

## Prerequisites

- Azure CLI installed and configured
- Azure subscription
- Node.js 18+ locally for building

## Azure Resources Required

1. **Azure App Service** - For the Node.js backend
2. **Azure Static Web Apps** - For the React frontend
3. **Azure Cosmos DB (MongoDB API)** - For the database

## Option 1: Azure App Service (Full-Stack)

Deploy both frontend and backend to a single Azure App Service.

### Step 1: Create Resource Group
```bash
az group create --name skillmatrix-rg --location eastus
```

### Step 2: Create App Service Plan
```bash
az appservice plan create \
  --name skillmatrix-plan \
  --resource-group skillmatrix-rg \
  --sku B1 \
  --is-linux
```

### Step 3: Create Web App
```bash
az webapp create \
  --name skillmatrix-app \
  --resource-group skillmatrix-rg \
  --plan skillmatrix-plan \
  --runtime "NODE:18-lts"
```

### Step 4: Create Cosmos DB (MongoDB API)
```bash
az cosmosdb create \
  --name skillmatrix-db \
  --resource-group skillmatrix-rg \
  --kind MongoDB \
  --server-version 4.2 \
  --default-consistency-level Eventual

# Create database
az cosmosdb mongodb database create \
  --account-name skillmatrix-db \
  --resource-group skillmatrix-rg \
  --name skillmatrix
```

### Step 5: Configure App Settings
```bash
# Get Cosmos DB connection string
COSMOS_CONNECTION=$(az cosmosdb keys list \
  --name skillmatrix-db \
  --resource-group skillmatrix-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

# Set environment variables
az webapp config appsettings set \
  --name skillmatrix-app \
  --resource-group skillmatrix-rg \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="$COSMOS_CONNECTION" \
    JWT_SECRET="your-production-jwt-secret" \
    JWT_EXPIRE="30d"
```

### Step 6: Deploy Application
```bash
# Build the application
npm run build

# Deploy using ZIP deploy
az webapp deployment source config-zip \
  --name skillmatrix-app \
  --resource-group skillmatrix-rg \
  --src deploy.zip
```

## Option 2: Separate Deployments (Recommended for Production)

### Backend: Azure App Service

Follow steps 1-5 from Option 1 for the backend.

### Frontend: Azure Static Web Apps

#### Step 1: Create Static Web App
```bash
az staticwebapp create \
  --name skillmatrix-frontend \
  --resource-group skillmatrix-rg \
  --location eastus2 \
  --source https://github.com/your-repo/skillmatrix \
  --branch main \
  --app-location "/client" \
  --output-location "dist" \
  --login-with-github
```

#### Step 2: Configure API URL
Create `staticwebapp.config.json` in the client folder (already included).

## Option 3: Azure Container Apps

### Step 1: Create Container Registry
```bash
az acr create \
  --name skillmatrixacr \
  --resource-group skillmatrix-rg \
  --sku Basic \
  --admin-enabled true
```

### Step 2: Build and Push Images
```bash
# Login to registry
az acr login --name skillmatrixacr

# Build and push server image
cd server
az acr build --registry skillmatrixacr --image skillmatrix-server:latest .

# Build and push client image
cd ../client
az acr build --registry skillmatrixacr --image skillmatrix-client:latest .
```

### Step 3: Create Container Apps Environment
```bash
az containerapp env create \
  --name skillmatrix-env \
  --resource-group skillmatrix-rg \
  --location eastus
```

### Step 4: Deploy Container Apps
```bash
# Get ACR credentials
ACR_PASSWORD=$(az acr credential show --name skillmatrixacr --query "passwords[0].value" -o tsv)

# Deploy server
az containerapp create \
  --name skillmatrix-server \
  --resource-group skillmatrix-rg \
  --environment skillmatrix-env \
  --image skillmatrixacr.azurecr.io/skillmatrix-server:latest \
  --registry-server skillmatrixacr.azurecr.io \
  --registry-username skillmatrixacr \
  --registry-password $ACR_PASSWORD \
  --target-port 5000 \
  --ingress external \
  --env-vars \
    NODE_ENV=production \
    MONGODB_URI=secretref:mongodb-uri \
    JWT_SECRET=secretref:jwt-secret

# Deploy client
az containerapp create \
  --name skillmatrix-client \
  --resource-group skillmatrix-rg \
  --environment skillmatrix-env \
  --image skillmatrixacr.azurecr.io/skillmatrix-client:latest \
  --registry-server skillmatrixacr.azurecr.io \
  --registry-username skillmatrixacr \
  --registry-password $ACR_PASSWORD \
  --target-port 80 \
  --ingress external
```

## GitHub Actions CI/CD

The repository includes GitHub Actions workflows for automated deployment. See `.github/workflows/` directory.

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port (default: 5000) | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRE` | JWT expiration time (default: 30d) | No |
| `CLIENT_URL` | Frontend URL for CORS | No |

## Monitoring

### Enable Application Insights
```bash
az monitor app-insights component create \
  --app skillmatrix-insights \
  --location eastus \
  --resource-group skillmatrix-rg

# Link to Web App
az webapp config appsettings set \
  --name skillmatrix-app \
  --resource-group skillmatrix-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$(az monitor app-insights component show \
    --app skillmatrix-insights \
    --resource-group skillmatrix-rg \
    --query instrumentationKey -o tsv)
```

## Troubleshooting

### View Logs
```bash
az webapp log tail --name skillmatrix-app --resource-group skillmatrix-rg
```

### SSH into Container
```bash
az webapp ssh --name skillmatrix-app --resource-group skillmatrix-rg
```

### Check Health
```bash
curl https://skillmatrix-app.azurewebsites.net/api/health
```
