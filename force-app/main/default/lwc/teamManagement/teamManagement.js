import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import createTeam from '@salesforce/apex/TeamController.createTeam';
import updateTeam from '@salesforce/apex/TeamController.updateTeam';
import deleteTeam from '@salesforce/apex/TeamController.deleteTeam';
import isCoach from '@salesforce/apex/UserRoleHelper.isCoach';
import isAdmin from '@salesforce/apex/UserRoleHelper.isAdmin';

export default class TeamManagement extends LightningElement {
    @track teams = [];
    @track isModalOpen = false;
    @track isEditMode = false;
    @track editingTeamId = null;
    @track newTeam = {
        name: '',
        sport: '',
        category: '',
        active: true
    };
    @track hasAccess = false;

    wiredTeamsResult;

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
        { label: 'Aktywna', fieldName: 'Active__c', type: 'boolean' },
        {
            type: 'action',
            typeAttributes: { rowActions: this.getRowActions }
        }
    ];

    getRowActions(row, doneCallback) {
        const actions = [
            { label: 'Edytuj', name: 'edit' },
            { label: 'Usuń', name: 'delete' },
            { label: 'Zobacz zawodników', name: 'view_players' }
        ];
        doneCallback(actions);
    }

    @wire(isAdmin)
    wiredIsAdmin({ error, data }) {
        if (data !== undefined) {
            this.hasAccess = data;
        }
    }

    @wire(isCoach)
    wiredIsCoach({ error, data }) {
        if (data !== undefined && !this.hasAccess) {
            this.hasAccess = data;
        }
    }

    @wire(getActiveTeams)
    wiredTeams(result) {
        this.wiredTeamsResult = result;
        if (result.data) {
            this.teams = result.data;
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać drużyn', 'error');
        }
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        switch (actionName) {
            case 'delete':
                this.handleDelete(row.Id);
                break;
            case 'edit':
                this.handleEdit(row);
                break;
            case 'view_players':
                this.viewPlayers(row.Id);
                break;
            default:
        }
    }

    handleEdit(team) {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania drużynami', 'error');
            return;
        }
        
        this.isEditMode = true;
        this.editingTeamId = team.Id;
        
        this.newTeam = {
            name: team.Name,
            sport: team.Sport__c,
            category: team.Category__c,
            active: team.Active__c
        };
        
        this.isModalOpen = true;
    }

    async handleDelete(teamId) {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania drużynami', 'error');
            return;
        }
        
        if (confirm('Czy na pewno chcesz usunąć tę drużynę?')) {
            try {
                await deleteTeam({ teamId });
                this.showToast('Sukces', 'Drużyna została usunięta', 'success');
                refreshApex(this.wiredTeamsResult);
            } catch (error) {
                this.showToast('Błąd', error.body.message, 'error');
            }
        }
    }

    viewPlayers(teamId) {
        this.showToast('Info', 'Funkcja w przygotowaniu - lista zawodników drużyny', 'info');
    }

    openModal() {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania drużynami', 'error');
            return;
        }
        this.isModalOpen = true;
        this.isEditMode = false;
        this.editingTeamId = null;
        this.newTeam = {
            name: '',
            sport: '',
            category: '',
            active: true
        };
    }

    closeModal() {
        this.isModalOpen = false;
        this.isEditMode = false;
        this.editingTeamId = null;
        this.newTeam = { name: '', sport: '', category: '', active: true };
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        if (field === 'active') {
            this.newTeam[field] = event.target.checked;
        } else {
            this.newTeam[field] = event.target.value;
        }
    }

    async handleSave() {
        if (!this.hasAccess) {
            this.showToast('Błąd', 'Nie masz uprawnień do zarządzania drużynami', 'error');
            return;
        }
        
        try {
            if (!this.newTeam.name || !this.newTeam.sport || !this.newTeam.category) {
                this.showToast('Błąd', 'Wszystkie pola są wymagane', 'error');
                return;
            }

            if (this.isEditMode) {
                await updateTeam({
                    teamId: this.editingTeamId,
                    teamName: this.newTeam.name,
                    sport: this.newTeam.sport,
                    category: this.newTeam.category,
                    active: this.newTeam.active
                });
                this.showToast('Sukces', 'Drużyna została zaktualizowana', 'success');
            } else {
                await createTeam({
                    teamName: this.newTeam.name,
                    sport: this.newTeam.sport,
                    category: this.newTeam.category
                });
                this.showToast('Sukces', 'Drużyna została utworzona', 'success');
            }

            this.closeModal();
            refreshApex(this.wiredTeamsResult);
        } catch (error) {
            this.showToast('Błąd', error.body.message, 'error');
        }
    }

    get modalTitle() {
        return this.isEditMode ? 'Edytuj Drużynę' : 'Nowa Drużyna';
    }

    get saveButtonLabel() {
        return this.isEditMode ? 'Zaktualizuj' : 'Zapisz';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}