import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AppShell, Container, Title, Text, Group, Paper, Button, SimpleGrid, 
    ThemeIcon, Table, ActionIcon, Avatar, Menu, rem, Modal, TextInput, 
    NumberInput, Select, Stack, SegmentedControl, Center, Loader 
} from '@mantine/core';
import { 
    IconWallet, IconArrowUpRight, IconArrowDownLeft, IconPlus, IconLogout, 
    IconLayoutDashboard, IconTrash 
} from '@tabler/icons-react';

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [formType, setFormType] = useState('expense');
    const [formValues, setFormValues] = useState({ description: '', amount: '', category: '' });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            navigate('/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchTransactions(token);
    }, [navigate]);

    const fetchTransactions = async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error("Fout bij ophalen transacties:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        const token = localStorage.getItem('token');
        if (!formValues.amount || !formValues.description) return;

        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    ...formValues,
                    type: formType,
                    category: formValues.category || 'Overig' 
                })
            });

            if (response.ok) {
                const newTransaction = await response.json();
                setTransactions([newTransaction, ...transactions]);
                setModalOpen(false);
                setFormValues({ description: '', amount: '', category: '' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        if (!confirm("Weet je zeker dat je deze transactie wilt verwijderen?")) return;
        try {
            const response = await fetch(`${API_URL}/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setTransactions(transactions.filter(t => t.id !== id));
        } catch (error) { console.error(error); }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    if (!user) return null;

    const rows = transactions.map((t) => (
        <Table.Tr key={t.id}>
            <Table.Td>
                <Group gap="sm">
                    <ThemeIcon color={t.type === 'income' ? 'teal' : 'red'} variant="light" size="md" radius="xl">
                        {t.type === 'income' ? <IconArrowUpRight size={16} /> : <IconArrowDownLeft size={16} />}
                    </ThemeIcon>
                    <div>
                        <Text size="sm" fw={500}>{t.description}</Text>
                        <Text size="xs" c="dimmed">{t.category}</Text>
                    </div>
                </Group>
            </Table.Td>
            <Table.Td>
                <Text size="sm" fw={700} c={t.type === 'income' ? 'teal' : 'red'}>
                    {t.type === 'income' ? '+' : '-'} €{t.amount.toFixed(2)}
                </Text>
            </Table.Td>
            <Table.Td><Text size="xs" c="dimmed">{new Date(t.date || t.createdAt).toLocaleDateString()}</Text></Table.Td>
            <Table.Td>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleDelete(t.id)}><IconTrash size={16} /></ActionIcon>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <AppShell header={{ height: 60 }} padding="md" style={{ background: '#f8f9fa' }}>
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group justify="space-between" h="100%">
                        <Group>
                            <ThemeIcon size="lg" radius="md" color="grape" variant="filled"><IconWallet size={20} /></ThemeIcon>
                            <Title order={3} fw={800}>Belio Finance</Title>
                        </Group>
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button variant="subtle" color="gray" leftSection={<Avatar color="grape" radius="xl" size="sm">{user.username.slice(0, 2).toUpperCase()}</Avatar>}>{user.username}</Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {user.role === 'admin' && (
                                    <>
                                        <Menu.Label>Beheer</Menu.Label>
                                        <Menu.Item leftSection={<IconLayoutDashboard size={14} />} onClick={() => navigate('/admin')}>Admin Panel</Menu.Item>
                                        <Menu.Divider />
                                    </>
                                )}
                                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>Uitloggen</Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Container>
            </AppShell.Header>
            <AppShell.Main>
                <Container size="xl" py="lg">
                    <Group justify="space-between" mb="xl">
                        <div><Title order={2}>Overzicht</Title><Text c="dimmed">Welkom terug, {user.username}.</Text></div>
                        <Button leftSection={<IconPlus size={20} />} color="grape" onClick={() => setModalOpen(true)}>Nieuwe Transactie</Button>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
                        <CardStat title="Huidig Saldo" amount={balance} icon={IconWallet} color="blue" isTotal />
                        <CardStat title="Inkomsten" amount={totalIncome} icon={IconArrowUpRight} color="teal" />
                        <CardStat title="Uitgaven" amount={totalExpense} icon={IconArrowDownLeft} color="red" />
                    </SimpleGrid>
                    <Paper shadow="sm" radius="md" p="md" withBorder>
                        <Title order={4} mb="md">Recente Transacties</Title>
                        {loading ? <Center py="xl"><Loader /></Center> : <Table verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Omschrijving</Table.Th><Table.Th>Bedrag</Table.Th><Table.Th>Datum</Table.Th><Table.Th></Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows}</Table.Tbody></Table>}
                    </Paper>
                </Container>
            </AppShell.Main>
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Nieuwe Transactie" centered>
                <Stack>
                    <SegmentedControl value={formType} onChange={setFormType} data={[{ label: 'Uitgave', value: 'expense' }, { label: 'Inkomsten', value: 'income' }]} color={formType === 'income' ? 'teal' : 'red'} />
                    <TextInput label="Omschrijving" required value={formValues.description} onChange={(e) => setFormValues({...formValues, description: e.currentTarget.value})} />
                    <NumberInput label="Bedrag" prefix="€ " decimalScale={2} fixedDecimalScale required value={formValues.amount} onChange={(val) => setFormValues({...formValues, amount: val})} />
                    <Select label="Categorie" data={['Boodschappen', 'Huur', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig']} value={formValues.category} onChange={(val) => setFormValues({...formValues, category: val})} />
                    <Button mt="md" color={formType === 'income' ? 'teal' : 'red'} onClick={handleSubmit}>Toevoegen</Button>
                </Stack>
            </Modal>
        </AppShell>
    );
}
function CardStat({ title, amount, icon: Icon, color, isTotal }) {
    return (
        <Paper withBorder p="md" radius="md" shadow="sm">
            <Group justify="space-between">
                <div><Text size="xs" c="dimmed" fw={700} tt="uppercase">{title}</Text><Text fw={700} size="xl" mt="xs" c={isTotal ? (amount >= 0 ? 'dark' : 'red') : 'dark'}>€ {amount.toFixed(2)}</Text></div>
                <ThemeIcon color={color} variant="light" size="xl" radius="md"><Icon style={{ width: rem(24), height: rem(24) }} /></ThemeIcon>
            </Group>
        </Paper>
    );
}
export default Dashboard;