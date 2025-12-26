import { useEffect, useState, useMemo } from 'react';
import { 
    Table, Container, Title, Text, Group, Paper, ActionIcon, Badge, Avatar, 
    TextInput, SimpleGrid, Card, Modal, Button, Tooltip, Center, Loader, 
    Select, Switch, Stack, rem 
} from '@mantine/core';
import { 
    IconTrash, IconSearch, IconShieldLock, IconUsers, 
    IconEdit, IconDiamond 
} from '@tabler/icons-react';

function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modals
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [newRole, setNewRole] = useState(''); 
    const [isPremium, setIsPremium] = useState(false); 

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error("Kon gebruikers niet ophalen");
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setUsers(users.filter(u => u.id !== userToDelete.id));
                setDeleteModalOpen(false);
            }
        } catch (error) { console.error(error); }
    };

    const openEditModal = (user) => {
        setUserToEdit(user);
        setNewRole(user.role);
        setIsPremium(user.isPremium || false); 
        setEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!userToEdit) return;
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/users/${userToEdit.id}/role`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole, isPremium: isPremium })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
                setEditModalOpen(false);
            }
        } catch (error) { console.error(error); }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    // Stats: Nu zijn alle icoontjes 'teal'
    const stats = [
        { title: 'Totaal Gebruikers', value: users.length, icon: IconUsers, color: 'teal' },
        { title: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: IconShieldLock, color: 'teal' }, 
        { title: 'Premium Leden', value: users.filter(u => u.isPremium).length, icon: IconDiamond, color: 'teal' }, 
    ];

    if (loading) return <Center h="100vh"><Loader color="teal" size="xl" /></Center>;

    const rows = filteredUsers.map((user) => (
        <Table.Tr key={user.id}>
            <Table.Td>
                <Group gap="sm">
                    {/* Avatars zijn nu ook altijd teal voor een strakke look */}
                    <Avatar color="teal" name={user.username} radius="xl">
                        {user.username.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div>
                        <Group gap={6}>
                            <Text size="sm" fw={500}>{user.username}</Text>
                            {/* Premium Badge */}
                            {user.isPremium && <Badge leftSection={<IconDiamond size={8}/>} variant="gradient" gradient={{ from: 'teal', to: 'lime', deg: 105 }} size="xs">PREMIUM</Badge>}
                        </Group>
                        <Text size="xs" c="dimmed">{user.email}</Text>
                    </div>
                </Group>
            </Table.Td>
            <Table.Td>
                {/* Rol badge kleurt mee */}
                <Badge color={user.role === 'admin' ? 'teal' : 'gray'} variant="light">{user.role}</Badge>
            </Table.Td>
            <Table.Td><Text size="sm" c="dimmed">{new Date(user.createdAt).toLocaleDateString('nl-NL')}</Text></Table.Td>
            <Table.Td>
                <Group gap={0}>
                    <Tooltip label="Aanpassen"><ActionIcon variant="subtle" color="teal" onClick={() => openEditModal(user)}><IconEdit style={{ width: rem(20) }} /></ActionIcon></Tooltip>
                    <Tooltip label="Verwijderen"><ActionIcon variant="subtle" color="red" onClick={() => confirmDelete(user)}><IconTrash style={{ width: rem(20) }} /></ActionIcon></Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="xl">
            <Title order={2} mb="xl" c="teal">Gebruikersbeheer</Title>
            
            <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                {stats.map((stat) => (
                    <Card key={stat.title} withBorder shadow="sm" p="lg" radius="md">
                        <Group justify="space-between">
                            <div><Text size="xs" c="dimmed" fw={700} tt="uppercase">{stat.title}</Text><Text fw={700} size="xl">{stat.value}</Text></div>
                            <stat.icon size={32} color={stat.color} />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            <Paper shadow="sm" radius="md" withBorder p="md">
                <TextInput 
                    placeholder="Zoek gebruiker..." 
                    value={search} 
                    onChange={(e) => setSearch(e.currentTarget.value)} 
                    mb="md" 
                    leftSection={<IconSearch size={16} />} 
                />
                <Table.ScrollContainer minWidth={500}>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead><Table.Tr><Table.Th>Gebruiker</Table.Th><Table.Th>Rol</Table.Th><Table.Th>Lid sinds</Table.Th><Table.Th>Acties</Table.Th></Table.Tr></Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Verwijderen" centered>
                <Text size="sm" mb="lg">Weet je zeker dat je <strong>{userToDelete?.username}</strong> wilt verwijderen?</Text>
                <Group justify="flex-end"><Button variant="default" onClick={() => setDeleteModalOpen(false)}>Nee</Button><Button color="red" onClick={handleDelete}>Ja</Button></Group>
            </Modal>

            <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Gebruiker Aanpassen" centered>
                <Stack>
                    <Select 
                        label="Rol" 
                        data={['user', 'admin']} 
                        value={newRole} 
                        onChange={setNewRole} 
                        color="teal"
                    />
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between">
                            <div><Text fw={500} size="sm">Premium Status</Text><Text size="xs" c="dimmed">Toegang tot slimme functies</Text></div>
                            <Switch checked={isPremium} onChange={(e) => setIsPremium(e.currentTarget.checked)} color="teal" />
                        </Group>
                    </Paper>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setEditModalOpen(false)}>Annuleren</Button>
                        <Button color="teal" onClick={handleUpdateUser}>Opslaan</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}

export default AdminPanel;