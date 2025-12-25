// client/src/LandingPage.jsx
import { Container, Title, Text, Button, Group, SimpleGrid, ThemeIcon, Card, rem } from '@mantine/core';
import { IconChartPie3, IconCoin, IconLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      {/* --- HERO SECTIE --- */}
      <div style={{ background: '#f8f9fa', padding: '100px 0', textAlign: 'center' }}>
        <Container size="md">
          <Title order={1} size="h1" fw={900} style={{ fontSize: rem(48), marginBottom: rem(20) }}>
            Beheer je financiën met <Text span c="grape" inherit>Overdruiven</Text>
          </Title>
          
          <Text c="dimmed" size="xl" mb="xl" maw={600} mx="auto">
            Krijg direct inzicht in je inkomsten en uitgaven. Eenvoudig, veilig en overzichtelijk. 
            Start vandaag nog met besparen.
          </Text>

          <Group justify="center" gap="md">
            <Button size="xl" color="grape" onClick={() => navigate('/register')}>
              Start Nu Gratis
            </Button>
            <Button size="xl" variant="default" onClick={() => navigate('/login')}>
              Inloggen
            </Button>
          </Group>
        </Container>
      </div>

      {/* --- FEATURES SECTIE --- */}
      <Container size="lg" py="xl" mt="xl">
        <Title order={2} ta="center" mb="xl">Waarom Overdruiven?</Title>
        
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          <FeatureCard 
            icon={IconChartPie3} 
            title="Helder Inzicht" 
            description="Zie direct waar je geld naartoe gaat met duidelijke overzichten en categorieën."
          />
          <FeatureCard 
            icon={IconCoin} 
            title="Slim Budgetteren" 
            description="Stel doelen en houd je uitgaven onder controle. Wij helpen je besparen."
          />
          <FeatureCard 
            icon={IconLock} 
            title="Veilig & Privé" 
            description="Jouw data is van jou. Wij gebruiken beveiligde verbindingen en delen niets met derden."
          />
        </SimpleGrid>
      </Container>
    </>
  );
}

// Hulponderdeel voor de kaarten
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <ThemeIcon size={50} radius="md" variant="light" color="grape" mb="md">
        <Icon style={{ width: rem(30), height: rem(30) }} />
      </ThemeIcon>
      <Text fw={700} size="lg" mb="xs">{title}</Text>
      <Text c="dimmed" size="sm">{description}</Text>
    </Card>
  );
}

export default LandingPage;