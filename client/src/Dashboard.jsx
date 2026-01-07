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
                const result = await response.json();
                setTransactions(result.data || result);
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

    // --- BEREKENINGEN ---
    const activeTransactions = useMemo(() => {
        return transactions.filter(t => !t.isHidden);
    }, [transactions]);

    const totalIncome = activeTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = activeTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

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
        // AANPASSING 1: py="xl" -> py="md" (Minder witruimte boven/onder)
        <Container size="lg" py="md">
            {/* AANPASSING 2: mb="xl" -> mb="md" */}
            <Group justify="space-between" mb="md">
                <div>
                    <Title order={2} fw={800}>Overzicht</Title>
                    <Text c="dimmed" size="sm">Welkom terug, {user?.username}.</Text>
                </div>
                <Button leftSection={<IconPlus size={18} />} color="teal" radius="md" size="sm" onClick={() => setModalOpen(true)}>
                    Snel toevoegen
                </Button>
            </Group>

            {/* AANPASSING 3: mb="xl" -> mb="md" */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
                <CardStat title="Huidig Saldo" amount={balance} icon={IconWallet} color="blue" isTotal />
                <CardStat title="Inkomsten" amount={totalIncome} icon={IconArrowUpRight} color="teal" />
                <CardStat title="Uitgaven" amount={totalExpense} icon={IconArrowDownLeft} color="red" />
            </SimpleGrid>

            {/* Transacties Links, Donut Rechts */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                
                {/* 1. Recente Activiteit */}
                {/* AANPASSING 4: p="xl" -> p="md" */}
                <Paper shadow="xs" radius="lg" p="md" withBorder>
                    <Group justify="space-between" mb="sm">
                        <Title order={4}>Recente Activiteit</Title>
                        <Button variant="subtle" color="teal" size="xs" rightSection={<IconArrowRight size={14}/>} onClick={() => navigate('/transactions')}>
                            Alles
                        </Button>
                    </Group>

                    {loading ? (
                        <Center h={200}><Loader color="teal" /></Center>
                    ) : (
                        // Vertical spacing="xs" voor compactere tabel
                        <Table verticalSpacing="xs"> 
                            <Table.Tbody>
                                {activeTransactions.slice(0, 5).map((t) => (
                                    <Table.Tr key={t.id}>
                                        <Table.Td>
                                            <Group gap="xs">
                                                <ThemeIcon color={t.type === 'income' ? 'teal' : 'red'} variant="light" size="md" radius="xl">
                                                    {t.type === 'income' ? <IconArrowUpRight size={16} /> : <IconArrowDownLeft size={16} />}
                                                </ThemeIcon>
                                                <div>
                                                    <Tooltip label={t.description} openDelay={500} withArrow>
                                                        <Text size="sm" fw={500} style={{ cursor: 'default' }}>
                                                            {t.description.length > 35 ? `${t.description.substring(0, 30)}...` : t.description}
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

                {/* 2. DONUT CHART */}
                {/* AANPASSING 5: p="xl" -> p="md" */}
                <Paper shadow="xs" radius="lg" p="md" withBorder>
                    <Group mb="sm">
                        <IconChartPie size={20} color="gray" />
                        <Title order={4}>Uitgaven per Categorie</Title>
                    </Group>

                    {loading ? (
                        <Center h={200}><Loader color="teal" /></Center>
                    ) : donutData.length > 0 ? (
                        <Stack gap="md">
                            <Center>
                                {/* Donut iets verkleind naar 160px */}
                                <div style={{ position: 'relative', width: 160, height: 160 }}>
                                    <DonutChart 
                                        data={donutData} 
                                        withLabels={false} 
                                        withTooltip
                                        tooltipDataSource="segment"
                                        size={160} 
                                        thickness={16} 
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

                            <ScrollArea h={140} type="auto" offsetScrollbars>
                                <Stack gap="xs" pr="sm"> 
                                    {donutData.map(d => (
                                        <Group key={d.name} justify="space-between" wrap="nowrap">
                                            <Group gap="xs">
                                                <Box w={8} h={8} bg={d.color} style={{ borderRadius: '50%', flexShrink: 0 }} />
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
                        <Center h={200}><Text c="dimmed">Geen uitgaven.</Text></Center>
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
    // AANPASSING 6: p="xl" -> p="md"
    return (
        <Paper withBorder p="md" radius="lg" shadow="sm">
            <Group justify="space-between">
                <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: rem(1) }}>{title}</Text>
                    <Text fw={900} size="xl" mt={4} c={isTotal ? (amount >= 0 ? 'teal' : 'red') : 'dark'}>
                        € {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </div>
                <ThemeIcon color={color} variant="light" size={42} radius="md">
                    <Icon style={{ width: rem(24), height: rem(24) }} />
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

export default Dashboard;