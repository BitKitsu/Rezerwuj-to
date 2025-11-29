import { Link } from 'react-router-dom';

function HomePage() {
    const FeatureItem = ({ icon, title, description }) => (
        <li className="p-5 bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300"> 
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-xl font-semibold text-blue-800 mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </li>
    );
    
    const TestimonialCard = ({ quote, author }) => (
        <div className="bg-white p-6 rounded-xl shadow-xl h-full flex flex-col justify-between border border-gray-200">
            <p className="text-lg italic mb-4 text-gray-900">"{quote}"</p>
            <p className="text-sm font-semibold text-blue-600">- {author}</p>
        </div>
    );

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col pt-16 pb-12">
        
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8"> 

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold text-blue-900 leading-tight mb-4 animate-fade-in-down">
            🏢 System Rezerwacji dla Małych Firm
          </h1>
          <p className="text-xl md:text-2xl text-blue-700 mx-auto max-w-4xl animate-fade-in"> 
            Usprawnij zarządzanie rezerwacjami i rozwijaj swój biznes z łatwością!
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-6 mb-16 animate-fade-in-up">
          <Link to="/login">
            <button className="w-full md:w-auto px-10 py-5 text-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
              Zaloguj się
            </button>
          </Link>
          <Link to="/register">
            <button className="w-full md:w-auto px-10 py-5 text-xl font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105">
              Zarejestruj się
            </button>
          </Link>
        </div>

        <section className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 mb-16 animate-fade-in-late">
          <h2 className="text-4xl font-bold text-blue-800 text-center mb-8">
            Najważniejsze Funkcje Systemu
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 text-lg text-gray-700 list-none">
            <FeatureItem icon="📅" title="Inteligentny Kalendarz" description="Łatwo przeglądaj dostępność, zarządzaj terminami i unikaj konfliktów w jednym miejscu."/>
            <FeatureItem icon="📱" title="Dostęp Mobilny" description="Zarządzaj rezerwacjami z dowolnego urządzenia – w biurze, czy w podróży."/>
            <FeatureItem icon="💰" title="Elastyczny Cennik" description="Definiuj różne ceny i pakiety dla swoich usług oraz zarządzaj płatnościami online."/>
            <FeatureItem icon="🔔" title="Automatyczne Przypomnienia" description="Wysyłaj klientom automatyczne e-maile i SMS-y, aby zminimalizować nieobecności."/>
            <FeatureItem icon="🔒" title="Bezpieczeństwo Danych" description="Twoje dane i dane klientów są bezpieczne i szyfrowane zgodnie z RODO."/>
            <FeatureItem icon="📈" title="Raporty i Statystyki" description="Analizuj trendy rezerwacji, popularność usług i wydajność firmy."/>
          </ul>
        </section>

        <section className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 mb-16 animate-fade-in-late">
            <h2 className="text-4xl font-bold text-blue-800 text-center mb-8"> 
                Co mówią nasi użytkownicy?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <TestimonialCard quote="System jest intuicyjny i znacznie zmniejszył liczbę nieodebranych rezerwacji. Niezastąpiony!" author="Anna K., Salon Kosmetyczny"/>
                <TestimonialCard quote="Raporty pomagają mi podejmować lepsze decyzje biznesowe. Konfiguracja zajęła mi tylko 15 minut!" author="Marek B., Gabinet Fizjoterapii"/>
                <TestimonialCard quote="Prosty, elegancki i działa doskonale na każdym urządzeniu. Polecam każdej małej firmie!" author="Katarzyna W., Studio Treningu"/>
            </div>
        </section>

      </div> 

      <footer className="mt-8 text-blue-800 text-sm opacity-75 text-center w-full mx-auto px-4 sm:px-8">
        &copy; {new Date().getFullYear()} Twoja Firma. Stworzone dla rozwoju.
      </footer>
    </div>
  );
}

export default HomePage;