import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Container, Title, Text, Group, Paper, Button, SimpleGrid, 
    ThemeIcon, Table, Modal, TextInput, NumberInput, Select, Stack, 
    SegmentedControl, Center, Loader, rem
} from '@mantine/core';
import { 
    IconWallet, IconArrowUpRight, IconArrowDownLeft, IconPlus, IconArrowRight
} from '@tabler/icons-react';

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Quick Add Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [formType, setFormType] = useState('expense');
    const [formValues, setFormValues] = useState({ description: '', amount: '', category: 'Overig' });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    const fetchTransactions = useCallback(async (token) => {
        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [API_URL]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        if (token) fetchTransactions(token);
    }, [fetchTransactions]);

    // Simple Manual Submit (Voor Quick Add)
    const handleManualSubmit = async () => {
        const token = localStorage.getItem('token');
        if (!formValues.amount || !formValues.description) return;
        try {
            const response = await fetch(`${API_URL}/api/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formValues, type: formType, category: formValues.category || 'Overig' })
            });
            if (response.ok) {
                const newT = await response.json();
                setTransactions(prev => [newT, ...prev]);
                setModalOpen(false);
                setFormValues({ description: '', amount: '', category: 'Overig' });
            }
        } catch(e) { console.error(e); }
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2} fw={800}>Overzicht</Title>
                    <Text c="dimmed">Welkom terug, {user?.username}.</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} color="teal" radius="md" onClick={() => setModalOpen(true)}>
                    Snel toevoegen
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
                <CardStat title="Huidig Saldo" amount={balance} icon={IconWallet} color="teal" isTotal />
                <CardStat title="Inkomsten" amount={totalIncome} icon={IconArrowUpRight} color="teal" />
                <CardStat title="Uitgaven" amount={totalExpense} icon={IconArrowDownLeft} color="red" />
            </SimpleGrid>

            <Paper shadow="xs" radius="lg" p="xl" withBorder>
                <Group justify="space-between" mb="lg">
                    <Title order={4}>Recente Activiteit</Title>
                    <Button variant="subtle" color="teal" rightSection={<IconArrowRight size={16}/>} onClick={() => navigate('/transactions')}>
                        Alles bekijken
                    </Button>
                </Group>

                {loading ? (
                    <Center py="xl"><Loader color="teal" /></Center>
                ) : (
                    <Table verticalSpacing="md">
                        <Table.Tbody>
                            {transactions.slice(0, 5).map((t) => (
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
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Text size="sm" fw={700} c={t.type === 'income' ? 'teal' : 'red'}>
                                            {t.type === 'income' ? '+' : '-'} €{t.amount.toFixed(2)}
                                        </Text>
                                        <Text size="xs" c="dimmed">{new Date(t.date || t.createdAt).toLocaleDateString()}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {transactions.length === 0 && <Text c="dimmed" size="sm">Nog geen transacties.</Text>}
                        </Table.Tbody>
                    </Table>
                )}
            </Paper>

            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={<Text fw={700}>Nieuwe Transactie</Text>} centered radius="lg">
                <Stack>
                    <SegmentedControl 
                        value={formType} 
                        onChange={setFormType} 
                        data={[{ label: 'Uitgave', value: 'expense' }, { label: 'Inkomsten', value: 'income' }]} 
                        color={formType === 'income' ? 'teal' : 'red'} 
                        fullWidth
                    />
                    <TextInput label="Omschrijving" placeholder="Bijv. Boodschappen" required value={formValues.description} onChange={(e) => setFormValues({...formValues, description: e.currentTarget.value})} />
                    <NumberInput label="Bedrag" placeholder="0.00" prefix="€ " decimalScale={2} fixedDecimalScale required value={formValues.amount} onChange={(val) => setFormValues({...formValues, amount: val})} />
                    <Select label="Categorie" data={['Boodschappen', 'Huur', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig']} value={formValues.category} onChange={(val) => setFormValues({...formValues, category: val})} />
                    <Button mt="md" color={formType === 'income' ? 'teal' : 'red'} radius="md" size="md" onClick={handleManualSubmit}>Toevoegen</Button>
                </Stack>
            </Modal>
        </Container>
    );
}

// Hulpcomponent voor kaarten (deze stond al in je bestand, zorg dat hij onderaan staat)
function CardStat({ title, amount, icon: Icon, color, isTotal }) {
    return (
        <Paper withBorder p="xl" radius="lg" shadow="sm">
            <Group justify="space-between">
                <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: rem(1) }}>{title}</Text>
                    <Text fw={900} size="xl" mt="xs" c={isTotal ? (amount >= 0 ? 'teal' : 'red') : 'dark'}>
                        € {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </div>
                <ThemeIcon color={color} variant="light" size={48} radius="md">
                    <Icon style={{ width: rem(26), height: rem(26) }} />
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

export default Dashboard;