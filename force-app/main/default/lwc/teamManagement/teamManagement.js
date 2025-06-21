import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import createTeam from '@salesforce/apex/TeamController.createTeam';

export default class TeamManagement extends LightningElement {
    @track teams = [];
    @track isModalOpen = false;
    @track newTeam = {
        name: '',
        sport: '',
        category: ''
    };

    sportOptions = [
        { label: 'Football', value: 'Football' },
        { label: 'Basketball', value: 'Basketball' },
        { label: 'Volleyball', value: 'Volleyball' },
        { label: 'Tennis', value: 'Tennis' }
    ];

    categoryOptions = [
        { label: 'Młodzieżowa', value: 'Młodzieżowa' },
        { label: 'Juniorska', value: 'Juniorska' },
        { label: 'Seniorska', value: 'Seniorska' }
    ];

    columns = [
        { label: 'Nazwa Drużyny', fieldName: 'Name', type: 'text' },
        { label: 'Sport', fieldName: 'Sport__c', type: 'text' },
        { label: 'Kategoria', fieldName: 'Category__c', type: 'text' },
        { label: 'Trener', fieldName: 'CoachName', type: 'text' },
        { label: 'Aktywna', fieldName: 'Active__c', type: 'boolean' }
    ];

    @wire(getActiveTeams)
    wiredTeams(result) {
        this.wiredTeamsResult = result;
        if (result.data) {
            this.teams = result.data.map(team => ({
                ...team,
                CoachName: team.Team_Coach__r ? team.Team_Coach__r.Name : 'Brak trenera'
            }));
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać drużyn', 'error');
        }
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.newTeam = { name: '', sport: '', category: '' };
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        this.newTeam[field] = event.target.value;
    }

    async handleSave() {
        try {
            if (!this.newTeam.name || !this.newTeam.sport || !this.newTeam.category) {
                this.showToast('Błąd', 'Wszystkie pola są wymagane', 'error');
                return;
            }

            await createTeam({
                teamName: this.newTeam.name,
                sport: this.newTeam.sport,
                category: this.newTeam.category
            });

            this.showToast('Sukces', 'Drużyna została utworzona', 'success');
            this.closeModal();
            refreshApex(this.wiredTeamsResult);
        } catch (error) {
            this.showToast('Błąd', error.body.message, 'error');
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}