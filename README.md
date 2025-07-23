# HoloLens STL Loader

A cross-platform desktop application for loading, visualizing, and deploying STL files to Microsoft HoloLens devices.

![Application Interface](https://i.ibb.co/YFnppFRG/Screenshot-2025-07-23-at-5-31-25-PM.png)
![File Visualization](https://i.ibb.co/Hpn7G4ML/Screenshot-2025-07-23-at-5-31-16-PM.png)

## Overview

HoloLens STL Loader streamlines the process of working with STL files on Microsoft HoloLens devices. Built with Electron, React, and TypeScript, it provides an intuitive interface for 3D model visualization and deployment to mixed reality environments.

## Features

- **STL File Loading**: Import and parse STL files
- **3D Visualization**: Real-time preview of 3D models
- **HoloLens Integration**: Deploy models to HoloLens devices
- **Cross-Platform**: Support for Windows, macOS, and Linux
- **Modern UI**: React-based interface with TypeScript

## Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+
- **Node.js**: Version 16.0.0 or higher
- **HoloLens**: Microsoft HoloLens with Windows Device Portal enabled

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

## Available Commands

| Command               | Description               |
| --------------------- | ------------------------- |
| `npm run dev`         | Start development server  |
| `npm run build`       | Build for production      |
| `npm run build:win`   | Create Windows executable |
| `npm run build:mac`   | Create macOS application  |
| `npm run build:linux` | Create Linux AppImage     |

## Technology Stack

- **Electron**: Desktop application framework
- **React**: User interface library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and development server
- **Three.js**: 3D graphics rendering

## License

This project is proprietary software. All rights reserved.
