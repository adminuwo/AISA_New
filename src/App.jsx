import './App.css'
import NavigationProvider from './Navigation.Provider'
import { RecoilRoot } from 'recoil'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import axios from 'axios'
import toast from 'react-hot-toast'
import { clearUser } from './userStore/userData'
//chat 
// Global Interceptor for Session Management
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.response.data?.code === 'SESSION_REVOKED') {
        toast.error("Security Alert: You have been logged out remotely.");
        clearUser();
        // Force refresh to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-quint',
    })
  }, [])

  return (
    <RecoilRoot>
      <NavigationProvider />
    </RecoilRoot>
  )
}

export default App

