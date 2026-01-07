import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    Container, Title, Text, Group, Paper, Button, Table, ActionIcon, 
    Modal, TextInput, NumberInput, Select, Stack, SegmentedControl, 
    Center, Loader, FileButton, Checkbox, ThemeIcon, rem, Progress, Tooltip,
    Textarea, SimpleGrid, CloseButton, FileInput, // <--- FileInput weer toegevoegd
    Affix, Transition 
} from '@mantine/core';
import { 
    IconTrash, IconUpload, IconPlus, IconArrowUpRight, IconArrowDownLeft, 
    IconFileSpreadsheet, IconEye, IconEyeOff, IconDeviceFloppy,
    IconPencil, IconNotes, IconDots,
    IconSearch, IconFilter, IconX, IconPaperclip 
} from '@tabler/icons-react';
import { Menu } from '@mantine/core';

function Transactions() {
    // Bestaande States
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); 
    const [filterCategory, setFilterCategory] = useState(null);

    // Edit States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editFile, setEditFile] = useState(null); // <--- State voor bestand hersteld
    const [saving, setSaving] = useState(false); // <--- State voor opslaan laadicoon

    // Upload States
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');

    // Formulier States
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
                const result = await response.json();
                setTransactions(result.data || result); 
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

    // --- FILTERS ---
    const uniqueCategories = useMemo(() => {
        const cats = new Set(transactions.map(t => t.category).filter(Boolean));
        return [...cats].sort();
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = filterType === 'all' ? true : t.type === filterType;
            const matchesCategory = filterCategory ? t.category === filterCategory : true;
            return matchesSearch && matchesType && matchesCategory;
        });
    }, [transactions, searchQuery, filterType, filterCategory]);

    const clearFilters = () => {
        setSearchQuery('');
        setFilterType('all');
        setFilterCategory(null);
    };
    const hasActiveFilters = searchQuery !== '' || filterType !== 'all' || filterCategory !== null;

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleRowClick = (transaction) => {
        setEditingTransaction({ ...transaction });
        setEditFile(null); // Reset bestand bij openen
        setEditModalOpen(true);
    };

    // Herstelde update functie met FormData support
    const handleUpdateSubmit = async () => {
        const token = localStorage.getItem('token');
        if (!editingTransaction) return;

        setSaving(true);
        try {
            let body;
            let headers = { 'Authorization': `Bearer ${token}` };

            if (editFile) {
                // SCENARIO 1: Bestand aanwezig -> FormData
                const formData = new FormData();
                formData.append('description', editingTransaction.description);
                formData.append('amount', editingTransaction.amount);
                formData.append('category', editingTransaction.category);
                formData.append('notes', editingTransaction.notes || '');
                formData.append('date', editingTransaction.date);
                formData.append('receipt', editFile); 
                
                body = formData;
            } else {
                // SCENARIO 2: Geen bestand -> JSON
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    description: editingTransaction.description,
                    amount: editingTransaction.amount,
                    category: editingTransaction.category,
                    notes: editingTransaction.notes,
                    date: editingTransaction.date
                });
            }

            const response = await fetch(`${API_URL}/api/transactions/${editingTransaction.id}`, {
                method: 'PUT',
                headers: headers,
                body: body
            });

            if (response.ok) {
                const updatedTx = await response.json();
                setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
                setEditModalOpen(false);
                setEditFile(null);
            } else {
                alert("Er ging iets mis bij het opslaan.");
            }
        } catch (error) {
            console.error("Fout bij updaten:", error);
            alert("Check console");
        } finally {
            setSaving(false);
        }
    };

    const toggleVisibility = async (id, e) => {
        if(e) e.stopPropagation(); 
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
        } catch (error) { console.error(error); }
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
                if (percentComplete === 100) setUploadStatus('Verwerken...');
            }
        };

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                await fetchTransactions();
                setUploadProgress(100);
                setTimeout(() => { setProcessing(false); setUploadProgress(0); }, 500);
            } else {
                setProcessing(false);
                alert("Fout bij uploaden");
            }
        };
        xhr.onerror = () => { alert("Netwerkfout"); setProcessing(false); };
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
        } catch (error) { console.error(error); }
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
        } catch (error) { console.error(error); }
    };

    return (
        <Container size="lg" py="xl">
            {/* Header */}
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

            {/* Filter & Zoek Balk */}
            <Paper shadow="xs" radius="lg" p="md" mb="lg" withBorder>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <TextInput 
                        placeholder="Zoeken..." 
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                    
                    <Select 
                        placeholder="Type"
                        leftSection={<IconFilter size={16} />}
                        data={[{ value: 'all', label: 'Alles' }, { value: 'income', label: 'Inkomsten' }, { value: 'expense', label: 'Uitgaven' }]}
                        value={filterType}
                        onChange={setFilterType}
                        allowDeselect={false}
                    />

                    <Group gap="xs" wrap="nowrap">
                        <Select 
                            placeholder="Categorie"
                            data={uniqueCategories}
                            value={filterCategory}
                            onChange={setFilterCategory}
                            searchable
                            clearable
                            style={{ flex: 1 }}
                        />
                        {hasActiveFilters && (
                            <Tooltip label="Filters wissen">
                                <ActionIcon variant="light" color="red" size="lg" radius="md" onClick={clearFilters}>
                                    <IconX size={18} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                </SimpleGrid>
            </Paper>

            {/* Tabel met Sticky Header */}
            <Paper shadow="xs" radius="lg" p={0} withBorder style={{ overflow: 'hidden' }}>
                {loading ? (
                    <Center py="xl"><Loader color="teal" /></Center>
                ) : (
                    <Table verticalSpacing="md" horizontalSpacing="md" highlightOnHover stickyHeader stickyHeaderOffset={0}>
                        <Table.Thead bg="var(--mantine-color-body)">
                            <Table.Tr>
                                <Table.Th style={{ width: rem(50), textAlign: 'center' }}>
                                    <Checkbox 
                                        checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                                        indeterminate={selectedIds.length > 0 && selectedIds.length < filteredTransactions.length}
                                        onChange={(e) => setSelectedIds(e.currentTarget.checked ? filteredTransactions.map(t => t.id) : [])}
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
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => (
                                    <Table.Tr 
                                        key={t.id} 
                                        style={{ 
                                            backgroundColor: selectedIds.includes(t.id) ? 'var(--mantine-color-teal-0)' : undefined,
                                            opacity: t.isHidden ? 0.5 : 1 
                                        }}
                                    >
                                        <Table.Td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
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
                                                    <Group gap={5}>
                                                        <Text size="sm" fw={500} td={t.isHidden ? 'line-through' : undefined}>
                                                            {t.description}
                                                        </Text>
                                                        {t.notes && (
                                                            <Tooltip label={t.notes} withArrow position="right" multiline w={220}>
                                                                <IconNotes size={14} color="var(--mantine-color-gray-5)" style={{ cursor: 'help' }} />
                                                            </Tooltip>
                                                        )}
                                                        {t.receiptUrl && (
                                                            <Tooltip label="Bon bekijken" withArrow>
                                                                <ActionIcon variant="transparent" size="xs" color="blue" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(t.receiptUrl, '_blank');
                                                                }}>
                                                                    <IconPaperclip size={14} /> 
                                                                </ActionIcon>
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
                                            <Group gap="xs" wrap="nowrap" justify="flex-end">
                                                <Tooltip label="Bewerken" withArrow>
                                                    <ActionIcon variant="subtle" color="teal" onClick={(e) => { e.stopPropagation(); handleRowClick(t); }}>
                                                        <IconPencil style={{ width: rem(18), height: rem(18) }} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Menu shadow="md" width={200} position="bottom-end">
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle" color="gray"><IconDots style={{ width: rem(18), height: rem(18) }} /></ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        {t.receiptUrl && (
                                                            <Menu.Item leftSection={<IconPaperclip size={14} />} onClick={() => window.open(t.receiptUrl, '_blank')}>Bekijk Bon</Menu.Item>
                                                        )}
                                                        <Menu.Item leftSection={t.isHidden ? <IconEye size={14} /> : <IconEyeOff size={14} />} onClick={(e) => toggleVisibility(t.id, e)}>
                                                            {t.isHidden ? 'Zichtbaar maken' : 'Verbergen'}
                                                        </Menu.Item>
                                                        <Menu.Divider />
                                                        <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={(e) => handleDelete(t.id, e)}>Verwijderen</Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))
                            ) : (
                                <Table.Tr><Table.Td colSpan={6}><Center py="xl"><Text c="dimmed">Geen transacties.</Text></Center></Table.Td></Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                )}
            </Paper>

            {/* Zwevende Actiebalk */}
            <Affix position={{ bottom: 30, left: 0, right: 0 }} zIndex={100}>
                <Transition transition="slide-up" mounted={selectedIds.length > 0}>
                    {(transitionStyles) => (
                        <Center>
                            <Paper 
                                style={transitionStyles} 
                                shadow="lg" 
                                radius="xl" 
                                p="xs" 
                                withBorder 
                                bg="var(--mantine-color-body)"
                            >
                                <Group gap="md" px="sm">
                                    <Text size="sm" fw={600} c="teal">{selectedIds.length} geselecteerd</Text>
                                    <div style={{ width: 1, height: 20, backgroundColor: 'var(--mantine-color-gray-3)' }} />
                                    <Button 
                                        color="red" 
                                        variant="light" 
                                        size="compact-sm" 
                                        leftSection={<IconTrash size={14} />} 
                                        onClick={handleBulkDelete}
                                    >
                                        Verwijderen
                                    </Button>
                                    <ActionIcon variant="transparent" color="gray" onClick={() => setSelectedIds([])} size="sm">
                                        <IconX size={14} />
                                    </ActionIcon>
                                </Group>
                            </Paper>
                        </Center>
                    )}
                </Transition>
            </Affix>

            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={<Text fw={700}>Nieuwe Transactie</Text>} centered radius="lg">
                <Stack>
                    <SegmentedControl 
                        value={formType} 
                        onChange={setFormType} 
                        data={[{ label: 'Uitgave', value: 'expense' }, { label: 'Inkomsten', value: 'income' }]} 
                        color={formType === 'income' ? 'teal' : 'red'} 
                        fullWidth
                    />
                    <TextInput label="Omschrijving" required value={formValues.description} onChange={(e) => setFormValues({...formValues, description: e.currentTarget.value})} />
                    <NumberInput label="Bedrag" prefix="€ " decimalScale={2} fixedDecimalScale required value={formValues.amount} onChange={(val) => setFormValues({...formValues, amount: val})} />
                    <Select label="Categorie" data={['Boodschappen', 'Huur', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig']} value={formValues.category} onChange={(val) => setFormValues({...formValues, category: val})} />
                    <Button mt="md" color={formType === 'income' ? 'teal' : 'red'} onClick={handleManualSubmit}>Toevoegen</Button>
                </Stack>
            </Modal>

            <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title={<Text fw={700}>Transactie Bewerken</Text>} centered radius="lg">
                {editingTransaction && (
                    <Stack>
                        <TextInput label="Omschrijving" value={editingTransaction.description} onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})} />
                        <NumberInput label="Bedrag" value={editingTransaction.amount} prefix="€ " decimalScale={2} fixedDecimalScale onChange={(val) => setEditingTransaction({...editingTransaction, amount: val})} />
                        <Select 
                            label="Categorie" 
                            data={['Boodschappen', 'Woonlasten', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 'Overig', 'Toeslagen', 'Water', 'Verzekeringen', 'Reizen', 'Cadeaus', 'Internet en TV', 'Mobiel', 'Belastingen', 'Verzorging', 'Brandstof', 'OV', 'Auto', 'Huishouden', 'Afhalen', 'Entertainment', 'Sport', 'Shopping', 'Sparen', 'Aflossing']} 
                            searchable
                            value={editingTransaction.category} 
                            onChange={(val) => setEditingTransaction({...editingTransaction, category: val})} 
                        />
                        <Textarea label="Notities" minRows={3} value={editingTransaction.notes || ''} onChange={(e) => setEditingTransaction({...editingTransaction, notes: e.target.value})} />
                        
                        {/* --- HIER IS HIJ WEER: HET UPLOAD VELD! --- */}
                        <FileInput
                            label="Bon toevoegen"
                            description="Upload een foto of PDF van de bon (Max 5MB)"
                            placeholder={editingTransaction.receiptUrl ? "Nieuwe bon kiezen (overschrijft huidige)" : "Upload afbeelding"}
                            leftSection={<IconPaperclip size={16} />}
                            clearable
                            value={editFile}
                            onChange={setEditFile}
                            accept="image/png,image/jpeg,application/pdf"
                        />
                        {/* Status melding */}
                        {editingTransaction.receiptUrl && !editFile && (
                            <Group gap="xs">
                                <IconPaperclip size={14} color="var(--mantine-color-teal-6)" />
                                <Text size="xs" c="teal">Huidige bon gekoppeld</Text>
                            </Group>
                        )}
                        {/* ------------------------------------------- */}

                        <Group justify="space-between" mt="md">
                            <Button variant="subtle" color="red" size="xs" onClick={() => handleDelete(editingTransaction.id)}>Verwijderen</Button>
                            <Group>
                                <Button variant="default" onClick={() => setEditModalOpen(false)}>Annuleren</Button>
                                <Button leftSection={<IconDeviceFloppy size={18} />} color="teal" loading={saving} onClick={handleUpdateSubmit}>Opslaan</Button>
                            </Group>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal opened={processing} onClose={() => {}} withCloseButton={false} centered radius="lg" padding="xl">
                <Stack align="center" gap="md">
                    <ThemeIcon size={60} radius="100%" color="teal" variant="light"><IconFileSpreadsheet size={30} /></ThemeIcon>
                    <Title order={4}>{uploadStatus}</Title>
                    <Progress value={uploadProgress} size="lg" radius="xl" color="teal" striped animated style={{ width: '100%' }} />
                </Stack>
            </Modal>
        </Container>
    );
}

export default Transactions;