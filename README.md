# MonitorHub Frontend

A comprehensive employee monitoring and management system built with React, Vite, and Ant Design.

## 🚀 Features

- **Real-time Dashboard** - Live employee activity monitoring
- **Screen Monitoring** - Live screen sharing and webcam feeds
- **Task Management** - Assign and track employee tasks
- **Meeting Management** - Schedule and join video conferences
- **Chat System** - Real-time messaging with file sharing
- **Event Management** - Company events and announcements
- **Fine Management** - Track and manage employee fines
- **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **Ant Design** - Professional UI components
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **React Icons** - Beautiful icon library
- **Axios** - HTTP client for API calls

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-frontend-repo-url>
   cd Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your backend URL:
   ```
   VITE_API_URL=http://localhost:5000
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Build for Production

```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

## 📁 Project Structure

```
Frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── admin/          # Admin-specific components
│   │   ├── employee/       # Employee-specific components
│   │   ├── shared/         # Shared components
│   │   └── meetings/       # Meeting components
│   ├── pages/              # Page components
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── public/                 # Static assets
├── package.json
└── vite.config.js
```

## 🔧 Configuration

### Environment Variables
- `VITE_API_URL` - Backend API URL
- `VITE_SOCKET_URL` - Socket.IO server URL

### Vite Configuration
The project uses Vite for fast development and building. Configuration is in `vite.config.js`.

## 🎨 Styling

- **Ant Design** - Primary UI framework
- **Custom CSS** - Additional styling in `src/index.css`
- **Responsive Design** - Mobile-first approach
- **Dark Theme** - Custom dark theme implementation

## 🔌 API Integration

The frontend communicates with the backend through:
- **REST API** - Standard HTTP requests
- **Socket.IO** - Real-time features
- **File Upload** - Multipart form data

## 🧪 Testing

```bash
# Run tests (if configured)
npm run test
```

## 📱 Features Overview

### Admin Dashboard
- Employee activity monitoring
- Live screen monitoring
- Task assignment and tracking
- Meeting management
- Fine management
- System analytics

### Employee Dashboard
- Personal task management
- Screen sharing for monitoring
- Meeting participation
- Chat communication
- Event viewing
- Fine tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the deployment logs
- Verify environment variables
- Ensure backend is running
- Check browser console for errors