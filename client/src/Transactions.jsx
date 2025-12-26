import { useEffect, useState, useCallback } from 'react';
import { 
    Container, Title, Text, Group, Paper, Button, Table, ActionIcon, 
    Modal, TextInput, NumberInput, Select, Stack, SegmentedControl, 
    Center, Loader, FileButton, Checkbox, ThemeIcon, rem, Progress, Tooltip,
    Textarea 
} from '@mantine/core';
import { 
    IconTrash, IconUpload, IconPlus, IconArrowUpRight, IconArrowDownLeft, 
    IconFileSpreadsheet, IconEye, IconEyeOff, IconDeviceFloppy,
    IconPencil,
    IconNotes // <--- NIEUW: Importeer het notities icoon
} from '@tabler/icons-react';

function Transactions() {
    // Bestaande States
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Edit States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);

    // Upload States
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // Formulier States (Voor nieuwe transacties)
    const [formType, setFormType] = useState('expense');
    const [formValues, setFormValues] = useState({ description: '', amount: '', category: 'Overig' });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    const fetchTransactions = useCallback(async () => {
        const token = localStorage.getItem('token');
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
        fetchTransactions();
    }, [fetchTransactions]);

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleRowClick = (transaction) => {
        setEditingTransaction({ ...transaction });
        setEditModalOpen(true);
    };

    const handleUpdateSubmit = async () => {
        const token = localStorage.getItem('token');
        if (!editingTransaction) return;

        try {
            const response = await fetch(`${API_URL}/api/transactions/${editingTransaction.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    description: editingTransaction.description,
                    amount: editingTransaction.amount,
                    category: editingTransaction.category,
                    notes: editingTransaction.notes,
                    date: editingTransaction.date
                })
            });

            if (response.ok) {
                const updatedTx = await response.json();
                setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
                setEditModalOpen(false);
            }
        } catch (error) {
            console.error("Fout bij updaten:", error);
        }
    };

    const toggleVisibility = async (id, e) => {
        e.stopPropagation(); 
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/api/transactions/${id}/toggle-visibility`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const updatedTx = await response.json();
                setTransactions(prev => prev.map(t => t.id === id ? { ...t, isHidden: updatedTx.isHidden } : t));
            }
        } catch (error) {
            console.error("Fout bij toggelen:", error);
        }
    };

    const handleCSVUpload = (file) => {
        if (!file) return;
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        setProcessing(true);
        setUploadProgress(0);
        setUploadStatus('Bestand uploaden...');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/transactions/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
                if (percentComplete === 100) {
                    setUploadStatus('Gegevens verwerken en opslaan...');
                }
            }
        };

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                await fetchTransactions();
                setUploadProgress(100);
                setTimeout(() => {
                    setProcessing(false);
                    setUploadProgress(0);
                }, 500);
            } else {
                try {
                    const result = JSON.parse(xhr.responseText);
                    alert(result.error || "Fout bij verwerken bestand");
                } catch (e) {
                    alert("Er is een onbekende fout opgetreden.");
                }
                setProcessing(false);
            }
        };

        xhr.onerror = () => {
            alert("Netwerkfout bij uploaden.");
            setProcessing(false);
        };

        xhr.send(formData);
    };

    const handleBulkDelete = async () => {
        const token = localStorage.getItem('token');
        if (!window.confirm(`Weet je zeker dat je ${selectedIds.length} transacties wilt verwijderen?`)) return;
    
        try {
            const response = await fetch(`${API_URL}/api/transactions/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ids: selectedIds })
            });
    
            if (response.ok) {
                setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
                setSelectedIds([]);
            }
        } catch (error) { console.error("Bulk delete error:", error); }
    };

    const handleDelete = async (id, e) => {
        if(e) e.stopPropagation();
        const token = localStorage.getItem('token');
        if (!window.confirm("Verwijderen?")) return;
        try {
            const res = await fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
            if (res.ok) {
                setTransactions(prev => prev.filter(t => t.id !== id));
                if(editModalOpen) setEditModalOpen(false);
            }
        } catch(e) { console.error(e); }
    };

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
        } catch (error) { console.error("Submit error:", error); }
    };

    return (
        <Container size="lg" py="xl">
            {/* Header Sectie */}
            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2}>Transacties</Title>
                    <Text c="dimmed">Beheer al je inkomsten en uitgaven.</Text>
                </div>
                <Group>
                    <FileButton onChange={handleCSVUpload} accept="text/csv" disabled={processing}>
                        {(props) => (
                            <Button {...props} variant="default" leftSection={<IconUpload size={18} />}>
                                Importeer CSV
                            </Button>
                        )}
                    </FileButton>
                    <Button leftSection={<IconPlus size={18} />} color="teal" onClick={() => setModalOpen(true)}>
                        Toevoegen
                    </Button>
                </Group>
            </Group>

            {/* Tabel Sectie */}
            <Paper shadow="xs" radius="lg" p="xl" withBorder>
                {selectedIds.length > 0 && (
                    <Group mb="md" p="xs" bg="red.0" style={{ borderRadius: 8 }}>
                        <Text size="sm" c="red">{selectedIds.length} geselecteerd</Text>
                        <Button color="red" variant="subtle" size="xs" leftSection={<IconTrash size={14} />} onClick={handleBulkDelete}>
                            Verwijderen
                        </Button>
                    </Group>
                )}

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
                                        color="teal"
                                    />
                                </Table.Th>
                                <Table.Th>Omschrijving</Table.Th>
                                <Table.Th>Bedrag</Table.Th>
                                <Table.Th>Categorie</Table.Th>
                                <Table.Th>Datum</Table.Th>
                                <Table.Th style={{ width: rem(120) }}></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {transactions.map((t) => (
                                <Table.Tr 
                                    key={t.id} 
                                    style={{ 
                                        backgroundColor: selectedIds.includes(t.id) ? 'var(--mantine-color-teal-0)' : undefined,
                                        opacity: t.isHidden ? 0.5 : 1 
                                    }}
                                >
                                    <Table.Td onClick={(e) => e.stopPropagation()}>
                                        <Checkbox 
                                            checked={selectedIds.includes(t.id)}
                                            onChange={() => toggleSelection(t.id)}
                                            color="teal"
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <ThemeIcon color={t.type === 'income' ? 'teal' : 'red'} variant="light" size="sm" radius="xl">
                                                {t.type === 'income' ? <IconArrowUpRight size={14} /> : <IconArrowDownLeft size={14} />}
                                            </ThemeIcon>
                                            <Stack gap={0}>
                                                {/* IMPLEMENTATIE OPTIE 1: Groep voor tekst + notitie icoon */}
                                                <Group gap={5}>
                                                    <Text size="sm" fw={500} td={t.isHidden ? 'line-through' : undefined}>
                                                        {t.description}
                                                    </Text>
                                                    {t.notes && (
                                                        <Tooltip label={t.notes} withArrow position="right" multiline w={220}>
                                                            <IconNotes size={14} color="var(--mantine-color-gray-5)" style={{ cursor: 'help' }} />
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                                {t.isHidden && <Text size="xs" c="dimmed">(Verborgen)</Text>}
                                            </Stack>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={700} c={t.type === 'income' ? 'teal' : 'red'}>
                                            {t.type === 'income' ? '+' : '-'} €{t.amount.toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td><Text size="sm">{t.category}</Text></Table.Td>
                                    <Table.Td><Text size="xs" c="dimmed">{new Date(t.date || t.createdAt).toLocaleDateString()}</Text></Table.Td>
                                    
                                    <Table.Td onClick={(e) => e.stopPropagation()}>
                                        <Group gap="xs" wrap="nowrap">
                                            <Tooltip label="Bewerken" withArrow>
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color="gray" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRowClick(t);
                                                    }}
                                                >
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </Tooltip>

                                            <Tooltip label={t.isHidden ? "Zichtbaar maken" : "Verbergen in statistieken"} withArrow>
                                                <ActionIcon 
                                                    variant="subtle" 
                                                    color={t.isHidden ? "orange" : "gray"} 
                                                    onClick={(e) => toggleVisibility(t.id, e)}
                                                >
                                                    {t.isHidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                                </ActionIcon>
                                            </Tooltip>

                                            <ActionIcon variant="subtle" color="gray" onClick={(e) => handleDelete(t.id, e)}>
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
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

            <Modal 
                opened={editModalOpen} 
                onClose={() => setEditModalOpen(false)} 
                title={<Text fw={700}>Transactie Bewerken</Text>} 
                centered 
                radius="lg"
            >
                {editingTransaction && (
                    <Stack>
                        <TextInput 
                            label="Omschrijving" 
                            value={editingTransaction.description} 
                            onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})} 
                        />
                        <NumberInput 
                            label="Bedrag" 
                            value={editingTransaction.amount} 
                            prefix="€ "
                            decimalScale={2}
                            fixedDecimalScale
                            onChange={(val) => setEditingTransaction({...editingTransaction, amount: val})} 
                        />
                        <Select 
                            label="Categorie" 
                            data={[
                                'Boodschappen', 'Woonlasten', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig', 
                                'Toeslagen', 'Water', 'Verzekeringen', 'Voorgeschoten', 'Reizen', 'Cadeaus',
                                'Internet en TV', 'Mobiel', 'Belastingen', 'Verzorging', 'Brandstof', 'OV', 
                                'Auto', 'Huishouden', 'Afhalen', 'Entertainment', 'Sport', 'Shopping', 'Sparen', 'Aflossing'
                            ]} 
                            searchable
                            value={editingTransaction.category} 
                            onChange={(val) => setEditingTransaction({...editingTransaction, category: val})} 
                        />
                        <Textarea 
                            label="Notities" 
                            placeholder="Typ hier details, herinneringen of tags..."
                            minRows={3}
                            value={editingTransaction.notes || ''} 
                            onChange={(e) => setEditingTransaction({...editingTransaction, notes: e.target.value})}
                        />
                        
                        <Group justify="space-between" mt="md">
                            <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(editingTransaction.id)}>
                                Verwijderen
                            </Button>
                            <Group>
                                <Button variant="default" onClick={() => setEditModalOpen(false)}>Annuleren</Button>
                                <Button leftSection={<IconDeviceFloppy size={18} />} color="teal" onClick={handleUpdateSubmit}>
                                    Opslaan
                                </Button>
                            </Group>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal 
                opened={processing} 
                onClose={() => {}} 
                withCloseButton={false}
                centered radius="lg" padding="xl"
            >
                <Stack align="center" gap="md">
                    <ThemeIcon size={60} radius="100%" color="teal" variant="light">
                        <IconFileSpreadsheet size={30} />
                    </ThemeIcon>
                    <Title order={4}>{uploadStatus}</Title>
                    <Text size="sm" c="dimmed" ta="center">
                        {uploadProgress < 100 
                            ? "Een ogenblik geduld, je bestand wordt geüpload." 
                            : "De server verwerkt je transacties. Dit kan even duren bij grote bestanden."}
                    </Text>
                    <Progress value={uploadProgress} size="lg" radius="xl" color="teal" striped animated style={{ width: '100%' }} />
                    <Text size="xs" fw={700} c="teal">{uploadProgress}%</Text>
                </Stack>
            </Modal>
        </Container>
    );
}

export default Transactions;