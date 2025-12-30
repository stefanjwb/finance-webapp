import { useEffect, useState, useMemo } from 'react';
import { 
    Container, Title, Text, Group, Paper, Select, Loader, 
    Center, SimpleGrid, Stack, Box, ScrollArea, rem, ThemeIcon
} from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import { IconChartPie, IconCalendar, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons-react';
import '@mantine/charts/styles.css';

// Zelfde kleurenpalet als Dashboard voor consistentie
const CHART_COLORS = [
    'teal.6', 'indigo.5', 'cyan.5', 'blue.5', 'violet.5', 'grape.5', 'lime.5', 'yellow.5'
];

function Statistics() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(null); // Formaat: "YYYY-MM"

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    // 1. Data ophalen
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await fetch(`${API_URL}/api/transactions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTransactions(data);
                    
                    // Zet standaard de huidige maand als geselecteerd (als er data is)
                    if (data.length > 0) {
                        const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"
                        // Check of er data is voor deze maand, anders pak de nieuwste transactie
                        const hasCurrent = data.some(t => (t.date || t.createdAt).startsWith(currentMonth));
                        if (hasCurrent) {
                            setSelectedMonth(currentMonth);
                        } else {
                            // Pak de maand van de meest recente transactie
                            const newest = data.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                            const newestMonth = (newest.date || newest.createdAt).slice(0, 7);
                            setSelectedMonth(newestMonth);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [API_URL]);

    // 2. Beschikbare maanden berekenen voor de dropdown
    const monthOptions = useMemo(() => {
        const uniqueMonths = new Set();
        transactions.forEach(t => {
            const dateStr = (t.date || t.createdAt).slice(0, 7); // "YYYY-MM"
            uniqueMonths.add(dateStr);
        });

        // Sorteer aflopend (nieuwste maand bovenaan)
        return Array.from(uniqueMonths).sort().reverse().map(monthStr => {
            const [year, month] = monthStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            // Mooie Nederlandse weergave: "Januari 2024"
            const label = date.toLocaleString('nl-NL', { month: 'long', year: 'numeric' });
            return { value: monthStr, label: label.charAt(0).toUpperCase() + label.slice(1) };
        });
    }, [transactions]);

    // 3. Filter transacties op basis van selectie
    const filteredTransactions = useMemo(() => {
        if (!selectedMonth) return [];
        return transactions.filter(t => 
            !t.isHidden && 
            (t.date || t.createdAt).startsWith(selectedMonth)
        );
    }, [transactions, selectedMonth]);

    // 4. Data voor Donut Chart (alleen uitgaven van deze maand)
    const donutData = useMemo(() => {
        const categories = {};
        let total = 0;

        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const cat = t.category || 'Overig';
                categories[cat] = (categories[cat] || 0) + t.amount;
                total += t.amount;
            });
        
        const data = Object.keys(categories)
            .sort((a, b) => categories[b] - categories[a])
            .map((cat, index) => ({
                name: cat,
                value: categories[cat],
                color: CHART_COLORS[index % CHART_COLORS.length]
            }));

        return { data, total };
    }, [filteredTransactions]);

    // 5. Totalen voor deze maand (Inkomsten vs Uitgaven)
    const monthlyStats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    if (loading) return <Center h="50vh"><Loader color="teal" /></Center>;

    return (
        <Container size="lg" py="lg">
            <Group justify="space-between" mb="lg">
                <Title order={2} fw={800}>Statistieken</Title>
                
                {/* Maand Selector */}
                <Select
                    placeholder="Kies een maand"
                    leftSection={<IconCalendar size={16} />}
                    data={monthOptions}
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    allowDeselect={false}
                    w={200}
                    radius="md"
                />
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                
                {/* KAART 1: DONUT CHART (Uitgaven) */}
                <Paper shadow="xs" radius="lg" p="lg" withBorder>
                    <Group mb="lg">
                        <IconChartPie size={20} color="gray" />
                        <Title order={4}>Uitgaven Categorieën</Title>
                    </Group>

                    {donutData.data.length > 0 ? (
                        <Stack gap="lg">
                            <Center>
                                <div style={{ position: 'relative', width: 170, height: 170 }}>
                                    <DonutChart 
                                        data={donutData.data} 
                                        withLabels={false} 
                                        withTooltip
                                        tooltipDataSource="segment"
                                        size={170} 
                                        thickness={17} 
                                        paddingAngle={3}
                                        valueFormatter={(val) => `€ ${val.toFixed(2)}`} 
                                    />
                                    <div style={{ 
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                                        textAlign: 'center', pointerEvents: 'none' 
                                    }}>
                                        <Text size="xs" c="dimmed" fw={700} tt="uppercase">Totaal</Text>
                                        <Text size="md" fw={900}>€ {donutData.total.toFixed(0)}</Text>
                                    </div>
                                </div>
                            </Center>

                            <ScrollArea h={200} type="auto" offsetScrollbars>
                                <Stack gap="sm" pr="sm"> 
                                    {donutData.data.map(d => (
                                        <Group key={d.name} justify="space-between" wrap="nowrap">
                                            <Group gap="xs">
                                                <Box w={10} h={10} bg={d.color} style={{ borderRadius: '50%', flexShrink: 0 }} />
                                                <Text size="sm" c="dimmed" truncate>{d.name}</Text>
                                            </Group>
                                            <Text size="sm" fw={600}>€ {d.value.toFixed(2)}</Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        </Stack>
                    ) : (
                        <Center h={250}><Text c="dimmed">Geen uitgaven in deze maand.</Text></Center>
                    )}
                </Paper>

                {/* KAART 2: MAANDOVERZICHT (Balans) */}
                <Stack>
                    <Paper shadow="xs" radius="lg" p="lg" withBorder>
                        <Title order={4} mb="md">Overzicht {monthOptions.find(m => m.value === selectedMonth)?.label}</Title>
                        
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                                        <IconArrowUpRight size={20} />
                                    </ThemeIcon>
                                    <Text c="dimmed">Inkomsten</Text>
                                </Group>
                                <Text fw={700} c="teal" size="lg">€ {monthlyStats.income.toFixed(2)}</Text>
                            </Group>

                            <Group justify="space-between">
                                <Group gap="xs">
                                    <ThemeIcon color="red" variant="light" size="lg" radius="md">
                                        <IconArrowDownLeft size={20} />
                                    </ThemeIcon>
                                    <Text c="dimmed">Uitgaven</Text>
                                </Group>
                                <Text fw={700} c="red" size="lg">€ {monthlyStats.expense.toFixed(2)}</Text>
                            </Group>

                            <Box style={{ borderTop: `1px solid ${rem(220)}`, paddingTop: rem(10), marginTop: rem(5) }}>
                                <Group justify="space-between">
                                    <Text fw={700}>Netto Resultaat</Text>
                                    <Text fw={900} size="xl" c={monthlyStats.balance >= 0 ? 'blue' : 'orange'}>
                                        € {monthlyStats.balance.toFixed(2)}
                                    </Text>
                                </Group>
                            </Box>
                        </Stack>
                    </Paper>

                    {/* Ruimte voor toekomstige extra grafieken (bijv. verloop per dag) */}
                    <Paper shadow="xs" radius="lg" p="lg" withBorder h="100%">
                        <Center h="100%">
                            <Text c="dimmed" size="sm" style={{ textAlign: 'center' }}>
                                Selecteer een andere maand via de knop rechtsboven om de historie te bekijken.
                            </Text>
                        </Center>
                    </Paper>
                </Stack>

            </SimpleGrid>
        </Container>
    );
}

export default Statistics;