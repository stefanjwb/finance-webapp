import { useEffect, useState, useMemo } from 'react';
import { 
    Container, Title, Text, Group, Paper, Button, SimpleGrid, 
    ThemeIcon, Modal, TextInput, NumberInput, Select, Stack, 
    Progress, ActionIcon, Center, Loader, rem, Badge
} from '@mantine/core';
import { 
    IconPlus, IconTrash, IconBuildingBank, IconShoppingCart, 
    IconCheck, IconAlertCircle 
} from '@tabler/icons-react';

function Budgets() {
    const [budgets, setBudgets] = useState([]);
    const [transactions, setTransactions] = useState([]); // Nodig om uitgaven te berekenen
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Form state
    const [formValues, setFormValues] = useState({ category: '', amount: '', type: 'variable' });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    // Data ophalen
    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            // 1. Haal budgetten op
            const resBudgets = await fetch(`${API_URL}/api/budgets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataBudgets = await resBudgets.json();
            
            // 2. Haal transacties op (om 'spent' te berekenen voor de huidige maand)
            const resTrans = await fetch(`${API_URL}/api/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataTrans = await resTrans.json();

            if (resBudgets.ok) setBudgets(dataBudgets);
            if (resTrans.ok) setTransactions(dataTrans);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Budget Toevoegen
    const handleSubmit = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/budgets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formValues)
            });
            if (response.ok) {
                fetchData(); // Herlaad alles
                setModalOpen(false);
                setFormValues({ category: '', amount: '', type: 'variable' });
            }
        } catch(e) { console.error(e); }
    };

    // Budget Verwijderen
    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/budgets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch(e) { console.error(e); }
    };

    // --- BEREKENINGEN ---

    // Huidige maand filteren voor transacties
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // "2024-01"

    // Helper: Hoeveel is er deze maand uitgegeven in een categorie?
    const getSpentAmount = (category) => {
        return transactions
            .filter(t => 
                !t.isHidden && 
                t.type === 'expense' && 
                t.category === category &&
                (t.date || t.createdAt).startsWith(currentMonthPrefix)
            )
            .reduce((acc, curr) => acc + curr.amount, 0);
    };

    const fixedBudgets = budgets.filter(b => b.type === 'fixed');
    const variableBudgets = budgets.filter(b => b.type === 'variable');

    const totalFixed = fixedBudgets.reduce((acc, b) => acc + b.amount, 0);
    const totalVariableLimit = variableBudgets.reduce((acc, b) => acc + b.amount, 0);
    const totalVariableSpent = variableBudgets.reduce((acc, b) => acc + getSpentAmount(b.category), 0);

    if (loading) return <Center h="50vh"><Loader color="teal" /></Center>;

    return (
        <Container size="lg" py="lg">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2} fw={800}>Budgetten</Title>
                    <Text c="dimmed">Beheer je vaste lasten en maandelijkse limieten.</Text>
                </div>
                <Button leftSection={<IconPlus size={20} />} color="teal" radius="md" onClick={() => setModalOpen(true)}>
                    Nieuw Budget
                </Button>
            </Group>

            {/* Samenvatting Top */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
                <Paper withBorder p="lg" radius="lg">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Totaal Vaste Lasten</Text>
                    <Text fw={900} size="xl" c="blue">€ {totalFixed.toLocaleString()}</Text>
                </Paper>
                <Paper withBorder p="lg" radius="lg">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Variabel Budget</Text>
                    <Text fw={900} size="xl" c="teal">€ {totalVariableLimit.toLocaleString()}</Text>
                </Paper>
                <Paper withBorder p="lg" radius="lg">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">Variabel Uitgegeven</Text>
                    <Text fw={900} size="xl" c={totalVariableSpent > totalVariableLimit ? 'red' : 'orange'}>
                        € {totalVariableSpent.toLocaleString()}
                    </Text>
                </Paper>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: 'start' }}>
                
                {/* KOLOM 1: VASTE LASTEN */}
                <Stack>
                    <Group gap="sm">
                        <IconBuildingBank size={20} color="gray" />
                        <Title order={4}>Vaste Lasten</Title>
                    </Group>
                    
                    {fixedBudgets.length > 0 ? (
                        <Paper withBorder radius="lg" overflow="hidden">
                            {fixedBudgets.map((budget, index) => (
                                <Group key={budget.id} justify="space-between" p="md" style={{ 
                                    borderBottom: index !== fixedBudgets.length - 1 ? `1px solid ${rem(230)}` : 'none',
                                    backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
                                }}>
                                    <Group>
                                        <ThemeIcon color="blue" variant="light" radius="md"><IconBuildingBank size={16}/></ThemeIcon>
                                        <Text fw={600}>{budget.category}</Text>
                                    </Group>
                                    <Group>
                                        <Text fw={700}>€ {budget.amount.toFixed(2)}</Text>
                                        <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(budget.id)}>
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            ))}
                        </Paper>
                    ) : (
                        <Paper withBorder p="lg" radius="lg"><Text c="dimmed" fs="italic">Geen vaste lasten ingesteld.</Text></Paper>
                    )}
                </Stack>

                {/* KOLOM 2: VARIABELE BUDGETTEN */}
                <Stack>
                    <Group gap="sm">
                        <IconShoppingCart size={20} color="gray" />
                        <Title order={4}>Variabele Budgetten</Title>
                    </Group>

                    {variableBudgets.length > 0 ? variableBudgets.map(budget => {
                        const spent = getSpentAmount(budget.category);
                        const percentage = Math.min((spent / budget.amount) * 100, 100);
                        const isOverBudget = spent > budget.amount;

                        return (
                            <Paper key={budget.id} withBorder p="lg" radius="lg">
                                <Group justify="space-between" mb="xs">
                                    <Text fw={700}>{budget.category}</Text>
                                    <Group gap="xs">
                                        <Text size="sm" c="dimmed">
                                            € {spent.toFixed(0)} / € {budget.amount.toFixed(0)}
                                        </Text>
                                        <ActionIcon color="gray" size="sm" variant="subtle" onClick={() => handleDelete(budget.id)}>
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                                
                                <Progress 
                                    value={percentage} 
                                    color={isOverBudget ? 'red' : (percentage > 85 ? 'orange' : 'teal')} 
                                    size="lg" 
                                    radius="xl" 
                                />
                                
                                <Group justify="space-between" mt={5}>
                                    <Text size="xs" c={isOverBudget ? 'red' : 'dimmed'}>
                                        {isOverBudget ? 'Budget overschreden!' : `${(budget.amount - spent).toFixed(0)} over`}
                                    </Text>
                                    <Text size="xs" c="dimmed">{percentage.toFixed(0)}%</Text>
                                </Group>
                            </Paper>
                        );
                    }) : (
                        <Paper withBorder p="lg" radius="lg"><Text c="dimmed" fs="italic">Geen budgetten ingesteld.</Text></Paper>
                    )}
                </Stack>
            </SimpleGrid>

            {/* MODAL VOOR TOEVOEGEN */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Budget Toevoegen" centered radius="lg">
                <Stack>
                    <Select 
                        label="Type Budget"
                        data={[
                            { value: 'fixed', label: 'Vaste Last (bijv. Huur)' },
                            { value: 'variable', label: 'Variabel Budget (bijv. Boodschappen)' }
                        ]}
                        value={formValues.type}
                        onChange={(val) => setFormValues({...formValues, type: val})}
                        allowDeselect={false}
                    />
                    
                    <Select 
                        label="Categorie" 
                        description="Moet overeenkomen met je transactie categorieën."
                        data={['Boodschappen', 'Huur', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig', 'Verzekering', 'Gas/Water/Licht']} 
                        searchable
                        creatable
                        getCreateLabel={(query) => `+ Maak ${query}`}
                        onCreate={(query) => {
                            // Dit is visueel, in de DB wordt het gewoon een string
                            return query;
                        }}
                        value={formValues.category} 
                        onChange={(val) => setFormValues({...formValues, category: val})} 
                    />
                    
                    <NumberInput 
                        label={formValues.type === 'fixed' ? "Bedrag per maand" : "Limiet per maand"} 
                        prefix="€ " 
                        required 
                        value={formValues.amount} 
                        onChange={(val) => setFormValues({...formValues, amount: val})} 
                    />

                    <Button mt="md" color="teal" onClick={handleSubmit}>Opslaan</Button>
                </Stack>
            </Modal>
        </Container>
    );
}

export default Budgets;