// In je AdminPanel.jsx

const handleDelete = async (id) => {
    if(!confirm("Weet je zeker dat je deze gebruiker wilt verwijderen?")) return;
  
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        // Update de lijst lokaal zodat de gebruiker direct verdwijnt
        setUsers(users.filter(user => user.id !== id));
      } else {
        alert("Er ging iets mis.");
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  // Bij je ActionIcon (de prullenbak):
  <ActionIcon 
    variant="subtle" 
    color="red" 
    onClick={() => handleDelete(user.id)} // <--- Koppel de functie hier
  >
    <IconTrash size={16} stroke={1.5} />
  </ActionIcon>