# TrustGrid

**Secure Digital Certificate Verification**

TrustGrid is a small digital certificate registry for a college demonstration. An administrator can issue certificates, verify their current status, revoke them, and inspect the audit trail. The application is split into REST microservices, uses MongoDB for persistent storage, and has a React web interface served through an API gateway.

## Architecture

```text
Browser -> Frontend (Nginx / Vite proxy) -> API Gateway
                                             |-> Auth service
                                             |-> Certificate service -> MongoDB
                                             |-> Verification service -> MongoDB
                                             |-> Revocation service -> MongoDB
                                             |-> Audit service -> MongoDB
```

All certificate services use the same `trustgrid` database and `certificates` collection. The gateway records successful issue and revoke operations in the audit service. In Docker and Kubernetes, services communicate by their DNS names, never by container-local `localhost`.

## Technologies

- Node.js and Express.js REST APIs
- MongoDB 8 with Mongoose and a persistent Docker volume / Kubernetes PVC
- React, Vite, and Lucide icons
- Docker and Docker Compose
- Kubernetes / Minikube

## Services and ports

| Service | Port | Purpose |
| --- | ---: | --- |
| Frontend | `8080` (Compose), `5173` (Vite), `30080` (Kubernetes NodePort) | React console |
| API gateway | `3000` | Browser-facing REST API |
| Auth service | `3001` | Demo administrator login |
| Certificate service | `3002` | Issue and list certificates |
| Verification service | `3003` | Verify certificate status |
| Revocation service | `3004` | Revoke certificates |
| Audit service | `3005` | Store and list audit events |
| MongoDB | `27017` in Docker; `27018` on the host | Persistent `trustgrid` database |

## Project structure

- `auth-service/`: demo administrator login
- `certificate-service/`: create and list certificates
- `verification-service/`: read live certificate status
- `revocation-service/`: mark a certificate revoked
- `audit-service/`: persist and list audit events
- `api-gateway/`: routes browser API requests to services
- `frontend/`: React console and Nginx API proxy
- `k8s/`: namespace, deployments, services, MongoDB PVC, and config
- `tests/flow.test.js`: end-to-end API lifecycle test

## Run locally with Docker Compose

Requirements: Docker Desktop (or Docker Engine) with Compose v2.

```powershell
Copy-Item .env.example .env
# Optional: edit .env to change the demo login

docker compose up --build -d
docker compose ps
```

Open the frontend at <http://localhost:8080>. The API gateway is at <http://localhost:3000>. The backend service ports are also published for learning and troubleshooting. MongoDB is available on host port `27018` and retains data in the named `mongo-data` volume.

Seed the database with 15 repeatable demo certificates (10 `VALID`, 5 `REVOKED`) without changing existing records:

```powershell
docker compose exec certificate-service npm run seed:demo
```

The seeder uses fixed `TG-DEMO-001` through `TG-DEMO-015` IDs and inserts only IDs that are not already present. Running it again does not duplicate or overwrite demo or user-created certificates. For Minikube, run `kubectl exec -n trustgrid deployment/certificate-service -- npm run seed:demo`.

Stop the services but keep the database:

```powershell
docker compose down
```

To remove the database volume as well (this permanently deletes stored certificates and audit records):

```powershell
docker compose down -v
```

## Run services directly for development

Start MongoDB first (or use an existing local MongoDB), then install each backend package and start its server in a separate terminal. If using Compose's MongoDB with these local Node processes, set `MONGO_URI=mongodb://localhost:27018/trustgrid` for the four database-backed services. For a standalone local MongoDB, use `mongodb://localhost:27017/trustgrid`. Set the gateway's service URLs to their local ports in its terminal:

```powershell
npm --prefix auth-service install
npm --prefix certificate-service install
npm --prefix verification-service install
npm --prefix revocation-service install
npm --prefix audit-service install
npm --prefix api-gateway install

# Start each service in a separate terminal. Set MONGO_URI before starting
# certificate, verification, revocation, and audit services.
npm --prefix auth-service start
npm --prefix certificate-service start
npm --prefix verification-service start
npm --prefix revocation-service start
npm --prefix audit-service start

# Set AUTH_SERVICE_URL, CERT_SERVICE_URL, VERIFY_SERVICE_URL,
# REVOKE_SERVICE_URL, and AUDIT_SERVICE_URL to localhost and ports 3001-3005.
npm --prefix api-gateway start
```

For the frontend development server, keep the API gateway running on port 3000; Vite proxies `/api` requests to it:

```powershell
npm --prefix frontend install
npm --prefix frontend run dev
```

Open <http://localhost:5173>. The frontend proxies requests through `/api` and does not contact individual services.

The demo login is `admin` / `admin123`. Change `DEMO_USERNAME` and `DEMO_PASSWORD` in `.env` before sharing a running demo. The demo token is intentionally not a production authentication system.

## API endpoints

All browser-facing endpoints are available through `http://localhost:3000`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | API gateway health |
| `POST` | `/auth/login` | Demo administrator login |
| `GET` | `/certificates` | List certificates |
| `POST` | `/certificates` | Issue a certificate |
| `GET` | `/certificates/:id` | Read a certificate |
| `GET` | `/verify/:id` | Verify a certificate's live status |
| `POST` | `/revoke/:id` | Revoke a certificate |
| `GET` | `/logs` | List newest audit events |
| `POST` | `/logs` | Add an audit event |

Example requests (PowerShell):

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/auth/login `
  -ContentType 'application/json' -Body '{"username":"admin","password":"admin123"}'

Invoke-RestMethod -Method Post http://localhost:3000/certificates `
  -ContentType 'application/json' `
  -Body '{"studentName":"Diya","course":"Computer Engineering","college":"ABC College"}'

Invoke-RestMethod http://localhost:3000/verify/TG123456789
Invoke-RestMethod -Method Post http://localhost:3000/revoke/TG123456789
Invoke-RestMethod http://localhost:3000/logs
```

Certificate IDs are generated by the service and should be copied from the create response rather than typed from the example. Missing fields return `400`, invalid credentials return `401`, and unknown certificate IDs return `404`.

## Certificate lifecycle

1. Sign in through the frontend or `POST /auth/login`.
2. Submit student name, course, and college to `POST /certificates`. TrustGrid assigns a unique `TG...` ID, sets `VALID`, and records `CERTIFICATE_CREATED`.
3. Use `GET /verify/:id` to read the certificate directly from MongoDB.
4. Submit `POST /revoke/:id`. TrustGrid sets the shared record to `REVOKED` and records `CERTIFICATE_REVOKED`.
5. Verify the same ID again. The response now reports `REVOKED` immediately.
6. Open Audit Activity or call `GET /logs` to review both events.

## Test the API lifecycle

With Compose running, run from the project root:

```powershell
npm test
```

The test checks valid and invalid login, required fields, create, valid verification, unknown IDs, revocation, post-revoke verification, duplicate revocation, and the audit trail.

## Kubernetes with Minikube

Requirements: Docker, kubectl, and Minikube. Build images into Minikube's image cache so Kubernetes can use them without a registry:

```powershell
minikube start --driver=docker
minikube image build -t trustgrid-auth-service:latest ./auth-service
minikube image build -t trustgrid-certificate-service:latest ./certificate-service
minikube image build -t trustgrid-verification-service:latest ./verification-service
minikube image build -t trustgrid-revocation-service:latest ./revocation-service
minikube image build -t trustgrid-audit-service:latest ./audit-service
minikube image build -t trustgrid-api-gateway:latest ./api-gateway
minikube image build -t trustgrid-frontend:latest ./frontend
kubectl apply -f k8s/
kubectl get nodes
kubectl get deployments,pods,services,pvc -n trustgrid
```

The API gateway is internal (`ClusterIP`). Only the frontend is exposed as NodePort `30080`, and its Nginx proxy routes `/api` to the gateway using Kubernetes DNS. Open the frontend with:

```powershell
minikube service frontend -n trustgrid --url
```

To run the API lifecycle test against the cluster gateway, use a separate terminal:

```powershell
kubectl port-forward -n trustgrid service/api-gateway 3000:3000
```

Then run `npm test` from the project root. To remove the resources:

```powershell
kubectl delete -f k8s/
```

## Troubleshooting

- **A page cannot reach the API:** Check `docker compose ps` and `docker compose logs api-gateway`. The frontend container reaches the gateway at `api-gateway:3000`; the browser uses the frontend's `/api` proxy.
- **MongoDB is still starting:** Compose waits for MongoDB health before starting database-backed services. Check `docker compose logs mongodb` and `docker compose logs certificate-service`.
- **Port already in use:** Change the host-side port before the colon in `docker-compose.yml`, such as `8081:80` for the frontend.
- **Kubernetes image pull errors:** Build the images using `minikube image build` commands above and check `imagePullPolicy: IfNotPresent`.
- **Kubernetes pods are not Ready:** Run `kubectl describe pod -n trustgrid <pod-name>` and `kubectl logs -n trustgrid deployment/<deployment-name>`.
- **Kubernetes frontend URL:** `minikube service frontend -n trustgrid --url` prints the reachable URL for the active Minikube driver.

This is a learning project. The demo login does not protect the other API routes with a production-grade identity system; add proper authentication, authorization, TLS, and secret management before using a real institution's data.
