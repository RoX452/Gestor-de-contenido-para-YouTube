# Gestor de Contenido para YouTube

<p align="center">
  <img src="screenshots/screenshot 1.png" width="800" alt="Gestor UI">
</p>
<p align="center">
  <img src="screenshots/screenshot 2.png" width="400" alt="Panel 1">
  <img src="screenshots/screenshot 3.png" width="400" alt="Panel 2">
</p>
Una aplicación web Full-Stack diseñada para analizar métricas, extraer transcripciones y estructurar guiones de canales de YouTube, optimizando el proceso de creación de contenido.

## Contexto y Origen del Proyecto

Este proyecto nació inicialmente como un conjunto de automatizaciones utilizando **n8n** (he incluido los archivos `.json` originales en la carpeta `n8n_workflows/` como referencia). Conforme las necesidades del flujo de trabajo crecieron, busqué una solución más personalizada.

Para lograrlo, me apoyé en **Google AI Studio** y apliqué técnicas de **Prompt Engineering** para traducir la lógica que tenía en n8n a una arquitectura de código propia usando React y Node.js. Este paso me permitió tener mucho más control, crear una interfaz de usuario a mi gusto, y facilitar la integración directa con APIs de Inteligencia Artificial (como Gemini y Apify).

## Características Principales

- **Módulo de Estudio**: Integración con APIs externas para la extracción automática de transcripciones de videos y lluvia de ideas apoyada en IA.
- **Sistema de Cola**: Panel de gestión para organizar proyectos, llevar un historial y controlar el estado de los videos en producción.
- **Módulo Radar**: Herramienta analítica para el seguimiento de canales, cálculo de métricas de viralidad y detección temprana de tendencias.
- **Backend Optimizado**: Configurado para el manejo eficiente de variables de entorno y consumo de servicios de IA.

## Tecnologías Utilizadas

- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Integraciones e IA**: Apify, Gemini API, Prompt Engineering
- **Prototipado inicial**: n8n

## Cómo ejecutar el proyecto

1. Clona el repositorio:
   ```bash
   git clone https://github.com/RoX452/Gestor-de-contenido-para-YouTube.git
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura tus variables de entorno en un archivo `.env` (guíate del `.env.example`).
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---
*Desarrollado como muestra de habilidades en transición de low-code a código completo, consumo de APIs y aplicación práctica de herramientas de IA Generativa.*
