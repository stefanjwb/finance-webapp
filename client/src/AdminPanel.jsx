import { useEffect, useState, useMemo } from 'react';
import { 
    Table, 
    Container, 
    Title, 
    Text, 
    Group, 
    Paper, 
    ActionIcon, 
    Badge, 
    Avatar, 
    TextInput, 
    SimpleGrid, 
    Card, 
    Modal, 
    Button, 
    Tooltip,
    Center,
    Loader,
    Select,
    rem
} from '@mantine/core';
import { 
    IconTrash, 
    IconSearch, 
    IconShieldLock, 
    IconUsers,
    IconUserPlus,
    IconEdit
} from '@tabler/icons-react';

function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // State voor Modals
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [newRole, setNewRole] = useState(''); // Tijdelijke opslag voor de selectie

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    // 1. Data Ophalen
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/users`);
            if (!response.ok) throw new Error("Kon gebruikers niet ophalen");
            const data = await response.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Verwijder Functies
    const confirmDelete = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`${API_URL}/api/users/${userToDelete.id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setUsers(users.filter(u => u.id !== userToDelete.id));
                setDeleteModalOpen(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    // 3. Bewerk (Rol) Functies
    const openEditModal = (user) => {
        setUserToEdit(user);
        setNewRole(user.role); // Zet de huidige rol als standaardwaarde
        setEditModalOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!userToEdit) return;

        try {
            const response = await fetch(`${API_URL}/api/users/${userToEdit.id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                
                // Update de lijst lokaal zonder te refreshen
                setUsers(users.map(u => (u.id === updatedUser.id ? updatedUser : u)));
                setEditModalOpen(false);
            } else {
                alert("Kon rol niet aanpassen.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    // 4. Filters & Stats
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.username.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    const stats = [
        { title: 'Totaal Gebruikers', value: users.length, icon: IconUsers, color: 'blue' },
        { title: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: IconShieldLock, color: 'grape' },
        { title: 'Nieuw deze maand', value: users.filter(u => new Date(u.createdAt) > new Date(new Date().setDate(1))).length, icon: IconUserPlus, color: 'teal' },
    ];

    if (loading) return <Center h="100vh"><Loader size="xl" /></Center>;

    // Tabel Rijen
    const rows = filteredUsers.map((user) => (
        <Table.Tr key={user.id}>
            <Table.Td>
                <Group gap="sm">
                    <Avatar color={user.role === 'admin' ? 'grape' : 'blue'} name={user.username} radius="xl">
                        {user.username.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text size="sm" fw={500}>{user.username}</Text>
                        <Text size="xs" c="dimmed">{user.email}</Text>
                    </div>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge 
                    color={user.role === 'admin' ? 'grape' : 'gray'} 
                    variant="light"
                    size="md"
                >
                    {user.role}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="dimmed">
                    {new Date(user.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap={0}>
                    <Tooltip label="Rol aanpassen" withArrow>
                        <ActionIcon 
                            variant="subtle" 
                            color="blue" 
                            onClick={() => openEditModal(user)}
                        >
                            <IconEdit style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>
                    
                    <Tooltip label="Verwijder gebruiker" withArrow>
                        <ActionIcon 
                            variant="subtle" 
                            color="red" 
                            onClick={() => confirmDelete(user)}
                        >
                            <IconTrash style={{ width: rem(20), height: rem(20) }} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Container size="xl" py="xl">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2} fw={800}>Gebruikersbeheer</Title>
                    <Text c="dimmed">Beheer toegang en accounts van Belio</Text>
                </div>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
                {stats.map((stat) => (
                    <Card key={stat.title} withBorder shadow="sm" padding="lg" radius="md">
                        <Group justify="space-between">
                            <div>
                                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{stat.title}</Text>
                                <Text fw={700} size="xl" mt="xs">{stat.value}</Text>
                            </div>
                            <stat.icon size={32} color={stat.color} stroke={1.5} />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>

            <Paper shadow="sm" radius="md" withBorder p="md">
                <Group mb="md">
                    <TextInput
                        placeholder="Zoek op naam of e-mail..."
                        leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        style={{ flex: 1, maxWidth: '400px' }}
                    />
                </Group>

                <Table.ScrollContainer minWidth={500}>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Gebruiker</Table.Th>
                                <Table.Th>Rol</Table.Th>
                                <Table.Th>Lid sinds</Table.Th>
                                <Table.Th>Acties</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            {/* DELETE MODAL */}
            <Modal 
                opened={deleteModalOpen} 
                onClose={() => setDeleteModalOpen(false)} 
                title="Gebruiker verwijderen"
                centered
            >
                <Text size="sm" mb="lg">
                    Weet je zeker dat je <strong>{userToDelete?.username}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setDeleteModalOpen(false)}>Annuleren</Button>
                    <Button color="red" onClick={handleDelete}>Verwijder Account</Button>
                </Group>
            </Modal>

            {/* EDIT ROLE MODAL */}
            <Modal 
                opened={editModalOpen} 
                onClose={() => setEditModalOpen(false)} 
                title="Rol aanpassen"
                centered
            >
                <Text size="sm" mb="xs">
                    Pas de rol aan voor gebruiker <strong>{userToEdit?.username}</strong>.
                </Text>
                
                <Select
                    label="Selecteer nieuwe rol"
                    placeholder="Kies een rol"
                    data={['user', 'admin']}
                    value={newRole}
                    onChange={setNewRole}
                    mb="lg"
                />

                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setEditModalOpen(false)}>Annuleren</Button>
                    <Button color="blue" onClick={handleUpdateRole}>Opslaan</Button>
                </Group>
            </Modal>

        </Container>
    );
}

export default AdminPanel;