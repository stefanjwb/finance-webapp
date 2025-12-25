import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AppShell, Container, Title, Text, Group, Paper, Button, SimpleGrid, 
    ThemeIcon, Table, ActionIcon, Avatar, Menu, rem, Modal, TextInput, 
    NumberInput, Select, Stack, SegmentedControl, Center, Loader, FileButton,
    Checkbox // Toegevoegd voor selectie
} from '@mantine/core';
import { 
    IconWallet, IconArrowUpRight, IconArrowDownLeft, IconPlus, IconLogout, 
    IconLayoutDashboard, IconTrash, IconChartPie3, IconUpload 
} from '@tabler/icons-react';

const BRAND_COLOR = '#12b886'; 

function Dashboard() {
    const navigate = useNavigate();
    
    // States
    const [user, setUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Selectie State
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Formulier States
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
        } catch (error) {
            console.error("Fout bij ophalen transacties:", error);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            navigate('/login');
            return;
        }
        
        try {
            setUser(JSON.parse(userData));
            fetchTransactions(token);
        } catch (e) {
            console.error("Fout bij parsen gebruikersdata:", e);
            navigate('/login');
        }
    }, [navigate, fetchTransactions]);

    // Bulk Delete Handler
    const handleBulkDelete = async () => {
        const token = localStorage.getItem('token');
        if (!window.confirm(`Weet je zeker dat je ${selectedIds.length} transacties wilt verwijderen?`)) return;
    
        try {
            const response = await fetch(`${API_URL}/api/transactions/bulk-delete`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ ids: selectedIds })
            });
    
            if (response.ok) {
                setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
                setSelectedIds([]); // Reset selectie
            }
        } catch (error) {
            console.error("Bulk delete error:", error);
        }
    };

    const handleCSVUpload = async (file) => {
        if (!file) return;
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        setProcessing(true);
        try {
            const response = await fetch(`${API_URL}/api/transactions/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || "Import geslaagd!");
                fetchTransactions(token);
            } else {
                alert(result.error || "Fout bij uploaden CSV");
            }
        } catch (error) {
            alert("Er is een netwerkfout opgetreden bij het uploaden.");
            console.error("Upload error:", error);
        } finally {
            setProcessing(false);
        }
    };

    const handleManualSubmit = async () => {
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
                setTransactions(prev => [newTransaction, ...prev]);
                setModalOpen(false);
                setFormValues({ description: '', amount: '', category: 'Overig' });
            }
        } catch (error) {
            console.error("Handmatige submit error:", error);
        }
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        if (!window.confirm("Weet je zeker dat je deze transactie wilt verwijderen?")) return;
        
        try {
            const response = await fetch(`${API_URL}/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setTransactions(prev => prev.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error("Verwijder error:", error);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    if (!user) return null;

    return (
        <AppShell header={{ height: 70 }} padding="md" style={{ background: '#fcfcfc' }}>
            <AppShell.Header>
                <Container size="lg" h="100%">
                    <Group justify="space-between" h="100%">
                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                            <ThemeIcon size={30} radius="md" color="teal" variant="light">
                                <IconChartPie3 size={18} />
                            </ThemeIcon>
                            <Text fw={900} size="xl" c="teal">Belio</Text>
                        </Group>
                        
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <Button variant="subtle" color="gray" leftSection={<Avatar color="teal" radius="xl" size="sm">{user.username?.slice(0, 2).toUpperCase()}</Avatar>}>
                                    {user.username}
                                </Button>
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
                <Container size="lg" py="xl">
                    <Group justify="space-between" mb="xl">
                        <div>
                            <Title order={2} fw={800}>Overzicht</Title>
                            <Text c="dimmed">Welkom terug, {user.username}.</Text>
                        </div>
                        <Group>
                            <FileButton onChange={handleCSVUpload} accept="text/csv" disabled={processing}>
                                {(props) => (
                                    <Button 
                                        {...props} 
                                        variant="light" 
                                        color="teal" 
                                        loading={processing}
                                        leftSection={<IconUpload size={18} />} 
                                        radius="md"
                                    >
                                        Importeer CSV
                                    </Button>
                                )}
                            </FileButton>
                            
                            <Button 
                                leftSection={<IconPlus size={20} />} 
                                color="teal" 
                                radius="md"
                                onClick={() => setModalOpen(true)}
                            >
                                Transactie
                            </Button>
                        </Group>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
                        <CardStat title="Huidig Saldo" amount={balance} icon={IconWallet} color="teal" isTotal />
                        <CardStat title="Inkomsten" amount={totalIncome} icon={IconArrowUpRight} color="teal" />
                        <CardStat title="Uitgaven" amount={totalExpense} icon={IconArrowDownLeft} color="red" />
                    </SimpleGrid>

                    <Paper shadow="xs" radius="lg" p="xl" withBorder>
                        <Group justify="space-between" mb="lg">
                            <Title order={4}>Recente Transacties</Title>
                            {selectedIds.length > 0 && (
                                <Button 
                                    color="red" 
                                    variant="light" 
                                    size="xs"
                                    leftSection={<IconTrash size={14} />} 
                                    onClick={handleBulkDelete}
                                >
                                    Verwijder geselecteerde ({selectedIds.length})
                                </Button>
                            )}
                        </Group>

                        {loading ? (
                            <Center py="xl"><Loader color="teal" /></Center>
                        ) : (
                            <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th style={{ width: rem(40) }}>
                                            <Checkbox 
                                                checked={selectedIds.length === transactions.length && transactions.length > 0}
                                                indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
                                                onChange={(e) => setSelectedIds(e.currentTarget.checked ? transactions.map(t => t.id) : [])}
                                            />
                                        </Table.Th>
                                        <Table.Th>Omschrijving</Table.Th>
                                        <Table.Th>Bedrag</Table.Th>
                                        <Table.Th>Datum</Table.Th>
                                        <Table.Th></Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {transactions.map((t) => (
                                        <Table.Tr key={t.id} style={{ backgroundColor: selectedIds.includes(t.id) ? 'var(--mantine-color-teal-0)' : undefined }}>
                                            <Table.Td>
                                                <Checkbox 
                                                    checked={selectedIds.includes(t.id)}
                                                    onChange={(e) => {
                                                        setSelectedIds(prev => 
                                                            e.currentTarget.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                                                        );
                                                    }}
                                                />
                                            </Table.Td>
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
                                                <ActionIcon variant="subtle" color="gray" onClick={() => handleDelete(t.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                        {!loading && transactions.length === 0 && (
                            <Center py="xl"><Text c="dimmed">Nog geen transacties gevonden.</Text></Center>
                        )}
                    </Paper>
                </Container>
            </AppShell.Main>

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
        </AppShell>
    );
}

function CardStat({ title, amount, icon: Icon, color, isTotal }) {
    return (
        <Paper withBorder p="xl" radius="lg" shadow="sm">
            <Group justify="space-between">
                <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase" ls={rem(1)}>{title}</Text>
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