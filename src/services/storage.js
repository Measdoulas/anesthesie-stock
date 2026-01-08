const STORAGE_KEY = 'anesthesie_inventory_data_v1';

export const loadData = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erreur chargement données:', error);
    }
    return null;
};

export const saveData = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Erreur sauvegarde données:', error);
    }
};
