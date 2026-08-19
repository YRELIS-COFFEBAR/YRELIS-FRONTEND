pipeline {
  agent any

  environment {
    NODE_TOOL = 'node-22'
    PROJECT_DIR = 'yrelis-coffeebar-frontend'
    REPO_URL = 'https://github.com/YRELIS-COFFEBAR/YRELIS-FRONTEND.git'
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: 'develop', 
            credentialsId: 'Ardamins', 
            url: 'https://github.com/YRELIS-COFFEBAR/YRELIS-FRONTEND.git'
      }
    }

    stage('Setup Node') {
      steps {
        nodejs(env.NODE_TOOL) {
          sh '''
            node --version
            npm --version
          '''
        }
      }
    }

    stage('Instalar dependencias') {
      steps {
        nodejs(env.NODE_TOOL) {
          sh 'npm ci || npm install'
        }
      }
    }

    stage('Compilar (producción)') {
      steps {
        nodejs(env.NODE_TOOL) {
          sh 'npm run build:prod'
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        sh 'ls -la dist/'
        archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
      }
    }

    stage('Desplegar (opcional)') {
      when {
        branch 'main'
      }
      steps {
        echo 'Configura aquí tu despliegue (SSH, Docker, Nginx, S3...)'
      }
    }
  }

  post {
    success {
      echo '✅ Build de Yrelis CoffeeBar completado correctamente.'
    }
    failure {
      echo '❌ El build de Yrelis CoffeeBar falló.'
    }
  }
}