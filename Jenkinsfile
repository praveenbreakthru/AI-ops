pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'aiops'
        BACKEND_PORT = '5666'
        FRONTEND_PORT = '5173'
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                echo 'Checking out source repository...'
                checkout scm
            }
        }

        stage('2. Prepare Environment') {
            steps {
                echo 'Preparing runtime storage directories and environment config...'
                sh '''
                    mkdir -p data logs
                    chmod -R 777 data logs
                    if [ ! -f .env ]; then
                        echo "Warning: .env not found, initializing from .env.example"
                        cp .env.example .env
                    fi
                '''
            }
        }

        stage('3. Build & Deploy') {
            steps {
                echo 'Building container images and deploying via Docker Compose...'
                sh '''
                    # Stop any running instances cleanly
                    docker compose down --remove-orphans || true
                    
                    # Build and start services in background
                    docker compose build
                    docker compose up -d
                '''
            }
        }

        stage('4. Health Check & Smoke Test') {
            steps {
                echo 'Waiting for services to initialize and verifying health...'
                sh '''
                    # Allow 8 seconds for Uvicorn & Nginx to warm up
                    sleep 8

                    echo "Testing Backend API Health..."
                    curl -s -f http://127.0.0.1:${BACKEND_PORT}/api/health || {
                        echo "ERROR: Backend health endpoint failed!"
                        docker compose logs backend --tail=30
                        exit 1
                    }

                    echo "Testing Frontend HTTP Response..."
                    curl -s -f http://127.0.0.1:${FRONTEND_PORT} > /dev/null || {
                        echo "ERROR: Frontend UI endpoint failed!"
                        docker compose logs frontend --tail=30
                        exit 1
                    }

                    echo "SUCCESS: Both Backend and Frontend are operational!"
                '''
            }
        }
    }

    post {
        always {
            echo 'Pruning dangling images...'
            sh 'docker image prune -f || true'
        }
        success {
            echo "============================================================"
            echo " AIOps Platform successfully deployed!"
            echo " - Web UI:  http://172.16.10.29:${FRONTEND_PORT}"
            echo " - Swagger: http://172.16.10.29:${BACKEND_PORT}/docs"
            echo " - Health:  http://172.16.10.29:${BACKEND_PORT}/api/health"
            echo "============================================================"
        }
        failure {
            echo "Deployment failed! Printing recent container logs:"
            sh 'docker compose logs --tail=50'
        }
    }
}
