import React, { useEffect, useState, useRef } from 'react';
// import logo from './logo.svg';
import './App.css';

// **** extend the Window to include our _env settings ****

declare global {
  interface Window { _env?:any }
}

interface User {
  id: string;
  username: string;
}

export default function App() {

  const initialLoadRef = useRef<boolean>(true);

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (initialLoadRef.current) {
      fetch(new URL('/users', window._env.Holder_Api_Public_Url).toString())
        .then(res => res.json())
        .then(users => setUsers(users))
      ;
      initialLoadRef.current = false;
    }
  });

  return(
    <div className="App">
    <h1>Users</h1>
      {users.map(user =>
        <div key={user.id}>{user.username}</div>
      )}
  </div>
  );
}