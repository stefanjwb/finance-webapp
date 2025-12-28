import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Container, Title, Text, Group, Paper, Button, SimpleGrid, 
    ThemeIcon, Table, Modal, TextInput, NumberInput, Select, Stack, 
    SegmentedControl, Center, Loader, rem, ScrollArea, Box, Tooltip
} from '@mantine/core';
import { 
    IconWallet, IconArrowUpRight, IconArrowDownLeft, IconPlus, IconArrowRight,
    IconChartPie
} from '@tabler/icons-react';
import { DonutChart } from '@mantine/charts';
import '@mantine/charts/styles.css';

// Professioneel kleurenpalet
const CHART_COLORS = [
    'teal.6', 'indigo.5', 'cyan.5', 'blue.5', 'violet.5', 'grape.5', 'lime.5', 'yellow.5'
];

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

    // --- BEREKENINGEN (AANGEPAST) ---

    // 1. Filter eerst de verborgen transacties eruit
    // 'activeTransactions' wordt gebruikt voor alle berekeningen en grafieken
    const activeTransactions = useMemo(() => {
        return transactions.filter(t => !t.isHidden);
    }, [transactions]);

    // 2. Bereken totalen op basis van de GEFILTERDE lijst
    const totalIncome = activeTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = activeTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    // 3. Data voor Donut Chart (op basis van GEFILTERDE lijst)
    const donutData = useMemo(() => {
        const categories = {};
        activeTransactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Overig';
            categories[cat] = (categories[cat] || 0) + t.amount;
        });
        
        return Object.keys(categories)
            .sort((a, b) => categories[b] - categories[a])
            .map((cat, index) => ({
                name: cat,
                value: categories[cat],
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));
    }, [activeTransactions]);

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
                <CardStat title="Huidig Saldo" amount={balance} icon={IconWallet} color="blue" isTotal />
                <CardStat title="Inkomsten" amount={totalIncome} icon={IconArrowUpRight} color="teal" />
                <CardStat title="Uitgaven" amount={totalExpense} icon={IconArrowDownLeft} color="red" />
            </SimpleGrid>

            {/* Transacties Links, Donut Rechts */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                
                {/* 1. Recente Activiteit */}
                <Paper shadow="xs" radius="lg" p="xl" withBorder>
                    <Group justify="space-between" mb="lg">
                        <Title order={4}>Recente Activiteit</Title>
                        <Button variant="subtle" color="teal" rightSection={<IconArrowRight size={16}/>} onClick={() => navigate('/transactions')}>
                            Alles
                        </Button>
                    </Group>

                    {loading ? (
                        <Center h={300}><Loader color="teal" /></Center>
                    ) : (
                        <Table verticalSpacing="sm">
                            <Table.Tbody>
                                {/* We gebruiken hier ook activeTransactions zodat verborgen items het dashboard niet vervuilen */}
                                {activeTransactions.slice(0, 5).map((t) => (
                                    <Table.Tr key={t.id}>
                                        <Table.Td>
                                            <Group gap="sm">
                                                <ThemeIcon color={t.type === 'income' ? 'teal' : 'red'} variant="light" size="md" radius="xl">
                                                    {t.type === 'income' ? <IconArrowUpRight size={16} /> : <IconArrowDownLeft size={16} />}
                                                </ThemeIcon>
                                                <div>
                                                    <Tooltip label={t.description} openDelay={500} withArrow>
                                                        <Text size="sm" fw={500} style={{ cursor: 'default' }}>
                                                            {t.description.length > 40 ? `${t.description.substring(0, 20)}...` : t.description}
                                                        </Text>
                                                    </Tooltip>
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
                                {activeTransactions.length === 0 && <Text c="dimmed" size="sm">Nog geen transacties.</Text>}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>

                {/* 2. DONUT CHART & SCROLLABLE LIJST */}
                <Paper shadow="xs" radius="lg" p="xl" withBorder>
                    <Group mb="lg">
                        <IconChartPie size={20} color="gray" />
                        <Title order={4}>Uitgaven per Categorie</Title>
                    </Group>

                    {loading ? (
                        <Center h={300}><Loader color="teal" /></Center>
                    ) : donutData.length > 0 ? (
                        <Stack gap="xl">
                            {/* De Donut zelf */}
                            <Center>
                                <div style={{ position: 'relative', width: 180, height: 180 }}>
                                    <DonutChart 
                                        data={donutData} 
                                        withLabels={false} 
                                        withTooltip
                                        tooltipDataSource="segment"
                                        size={180} 
                                        thickness={18} 
                                        paddingAngle={3}
                                        valueFormatter={(val) => `€ ${val.toFixed(2)}`} 
                                    />
                                    <div style={{ 
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                                        textAlign: 'center', pointerEvents: 'none' 
                                    }}>
                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Totaal</Text>
                                        <Text size="md" fw={900}>€ {totalExpense.toFixed(0)}</Text>
                                    </div>
                                </div>
                            </Center>

                            {/* Lijst met gekleurde bolletjes */}
                            <ScrollArea h={180} type="auto" offsetScrollbars>
                                <Stack gap="sm" pr="sm"> 
                                    {donutData.map(d => (
                                        <Group key={d.name} justify="space-between" wrap="nowrap">
                                            <Group gap="xs">
                                                <Box 
                                                    w={10} 
                                                    h={10} 
                                                    bg={d.color} 
                                                    style={{ 
                                                        borderRadius: '50%', 
                                                        flexShrink: 0 
                                                    }} 
                                                />
                                                <Text size="sm" c="dimmed" truncate>{d.name}</Text>
                                            </Group>
                                            <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                                                € {d.value.toFixed(2)}
                                            </Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        </Stack>
                    ) : (
                        <Center h={300}><Text c="dimmed">Geen uitgaven om weer te geven.</Text></Center>
                    )}
                </Paper>
            </SimpleGrid>

            {/* Modal */}
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