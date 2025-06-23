import { LightningElement, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getCurrentUserRole from '@salesforce/apex/UserRoleHelper.getCurrentUserRole';
import isCoach from '@salesforce/apex/UserRoleHelper.isCoach';
import isPlayer from '@salesforce/apex/UserRoleHelper.isPlayer';
import isAdmin from '@salesforce/apex/UserRoleHelper.isAdmin';
import getAccessibleTeams from '@salesforce/apex/UserRoleHelper.getAccessibleTeams';
import getMyPlayerRecord from '@salesforce/apex/UserRoleHelper.getMyPlayerRecord';

export default class RoleBasedDashboard extends LightningElement {
    @track currentUserRole = '';
    @track isCoachUser = false;
    @track isPlayerUser = false;
    @track isAdminUser = false;
    @track accessibleTeams = [];
    @track myPlayerData = null;

    @wire(getCurrentUserRole)
    wiredUserRole({ error, data }) {
        if (data) {
            this.currentUserRole = data;
        }
    }

    @wire(isCoach)
    wiredIsCoach({ error, data }) {
        if (data !== undefined) {
            this.isCoachUser = data;
        }
    }

    @wire(isPlayer)
    wiredIsPlayer({ error, data }) {
        if (data !== undefined) {
            this.isPlayerUser = data;
        }
    }

    @wire(isAdmin)
    wiredIsAdmin({ error, data }) {
        if (data !== undefined) {
            this.isAdminUser = data;
        }
    }

    @wire(getAccessibleTeams)
    wiredAccessibleTeams({ error, data }) {
        if (data) {
            this.accessibleTeams = data;
        }
    }

    @wire(getMyPlayerRecord)
    wiredPlayerRecord({ error, data }) {
        if (data && data.length > 0) {
            this.myPlayerData = data[0];
        }
    }

    get welcomeMessage() {
        switch(this.currentUserRole) {
            case 'ADMIN':
                return 'Witaj, Administratorze! Masz pełny dostęp do systemu.';
            case 'COACH':
                return 'Witaj, Trenerze! Możesz zarządzać treningami i frekwencją.';
            case 'PLAYER':
                return 'Witaj, Zawodniku! Możesz przeglądać swoje treningi i frekwencję.';
            default:
                return 'Witaj! Skontaktuj się z administratorem w celu przyznania uprawnień.';
        }
    }

    get availableActions() {
        const actions = [];
        
        if (this.isAdminUser) {
            actions.push(
                { label: 'Zarządzaj drużynami', action: 'teams' },
                { label: 'Zarządzaj zawodnikami', action: 'players' },
                { label: 'Zarządzaj treningami', action: 'trainings' },
                { label: 'Zarządzaj frekwencją', action: 'attendance' },
                { label: 'Raporty i statystyki', action: 'reports' }
            );
        } else if (this.isCoachUser) {
            actions.push(
                { label: 'Moje drużyny', action: 'my-teams' },
                { label: 'Planuj treningi', action: 'trainings' },
                { label: 'Kontroluj frekwencję', action: 'attendance' },
                { label: 'Statystyki drużyny', action: 'team-stats' }
            );
        } else if (this.isPlayerUser) {
            actions.push(
                { label: 'Moje treningi', action: 'my-trainings' },
                { label: 'Moja frekwencja', action: 'my-attendance' },
                { label: 'Kalendarz treningów', action: 'training-calendar' }
            );
        }
        
        return actions;
    }

    get hasTeamAccess() {
        return this.accessibleTeams && this.accessibleTeams.length > 0;
    }

    get playerInfo() {
        if (!this.myPlayerData) return null;
        
        return {
            name: this.myPlayerData.Name,
            jerseyNumber: this.myPlayerData.Jersey_Number__c,
            position: this.myPlayerData.Position__c,
            teamId: this.myPlayerData.Team__c
        };
    }
}