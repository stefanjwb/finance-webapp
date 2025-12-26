import { useEffect, useState, useCallback } from 'react';
import { 
    Container, Title, Text, Group, Paper, Button, Table, ActionIcon, 
    Modal, TextInput, NumberInput, Select, Stack, SegmentedControl, 
    Center, Loader, FileButton, Checkbox, ThemeIcon, rem, Progress // Progress toegevoegd
} from '@mantine/core';
import { 
    IconTrash, IconUpload, IconPlus, IconArrowUpRight, IconArrowDownLeft, 
    IconFileSpreadsheet // Icoon voor de modal
} from '@tabler/icons-react';

function Transactions() {
    // Bestaande States
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    
    // NIEUWE STATES voor upload voortgang
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState(''); // 'Uploaden...' of 'Verwerken...'

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

    // --- NIEUWE UPLOAD HANDLER ---
    const handleCSVUpload = (file) => {
        if (!file) return;
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);

        setProcessing(true);
        setUploadProgress(0);
        setUploadStatus('Bestand uploaden...');

        // We gebruiken XMLHttpRequest voor progress events (fetch kan dit niet standaard)
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/api/transactions/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        // 1. Luister naar upload voortgang
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
                
                // Als hij op 100% staat, is de browser klaar met sturen, maar de server denkt nog na
                if (percentComplete === 100) {
                    setUploadStatus('Gegevens verwerken en opslaan...');
                }
            }
        };

        // 2. Afhandeling als het klaar is
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Succes
                await fetchTransactions(); // Ververs de lijst
                // Korte vertraging zodat de gebruiker ziet dat het klaar is
                setUploadProgress(100);
                setTimeout(() => {
                    setProcessing(false);
                    setUploadProgress(0);
                }, 500);
            } else {
                // Error vanuit server (bijv. CSV formaat fout)
                try {
                    const result = JSON.parse(xhr.responseText);
                    alert(result.error || "Fout bij verwerken bestand");
                } catch (e) {
                    alert("Er is een onbekende fout opgetreden.");
                }
                setProcessing(false);
            }
        };

        // 3. Afhandeling netwerkfouten
        xhr.onerror = () => {
            alert("Netwerkfout bij uploaden.");
            setProcessing(false);
        };

        xhr.send(formData);
    };

    // ... (rest van de handlers: handleBulkDelete, handleDelete, handleManualSubmit blijven hetzelfde)
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

    const handleDelete = async (id) => {
        const token = localStorage.getItem('token');
        if (!window.confirm("Verwijderen?")) return;
        try {
            const res = await fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
            if (res.ok) setTransactions(prev => prev.filter(t => t.id !== id));
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
                            <Button 
                                {...props} 
                                variant="default" 
                                leftSection={<IconUpload size={18} />} 
                            >
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
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {transactions.map((t) => (
                                <Table.Tr key={t.id} style={{ backgroundColor: selectedIds.includes(t.id) ? 'var(--mantine-color-teal-0)' : undefined }}>
                                    <Table.Td>
                                        <Checkbox 
                                            checked={selectedIds.includes(t.id)}
                                            onChange={(e) => setSelectedIds(prev => e.currentTarget.checked ? [...prev, t.id] : prev.filter(id => id !== t.id))}
                                            color="teal"
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <ThemeIcon color={t.type === 'income' ? 'teal' : 'red'} variant="light" size="sm" radius="xl">
                                                {t.type === 'income' ? <IconArrowUpRight size={14} /> : <IconArrowDownLeft size={14} />}
                                            </ThemeIcon>
                                            <Text size="sm" fw={500}>{t.description}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm" fw={700} c={t.type === 'income' ? 'teal' : 'red'}>
                                            {t.type === 'income' ? '+' : '-'} €{t.amount.toFixed(2)}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td><Text size="sm">{t.category}</Text></Table.Td>
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
            </Paper>

            {/* Add Transaction Modal */}
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

            {/* NIEUW: Upload Progress Modal */}
            <Modal 
                opened={processing} 
                onClose={() => {}} // Lege functie: gebruiker mag dit niet wegklikken tijdens uploaden
                withCloseButton={false}
                centered
                radius="lg"
                padding="xl"
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