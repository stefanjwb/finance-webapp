// In je AdminPanel.jsx

const handleDelete = async (id) => {
    if(!confirm("Weet je zeker dat je deze gebruiker wilt verwijderen?")) return;
  
    try {
      // Gebruik de variabele of fallback naar 5001 (voor Mac support)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        // Update de lijst lokaal
        setUsers(users.filter(user => user.id !== id));
      } else {
        alert("Er ging iets mis bij het verwijderen.");
      }
    } catch (error) {
      console.error(error);
    }
  };