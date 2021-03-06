import React, { Component } from 'react';
import DirectoryCard from './DirectoryCard.js';
import firebase from '../../FirebaseConfig.js';
import {AccountType, DaysOfWeek, StringFormat} from '../../Enums.js';
import moment from 'moment';
import './Directory.css';
const db = firebase.database();

// import DirectoryFilter from './DirectoryFilter.js'; // TODO: DirectoryFilter Implementation

// @leon 04/02/2018: No logo data found in database, temporarily use this placeholder
const logoURL = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png';

class DirectoryPage extends Component {
    
    constructor(props) {
        super(props);
        this.state = {
            umbrellaId: '',
            raList: [],
            dgList: [],
            daList: [],
        };
    }

    async componentDidMount() {
        let umbrellaId = this.getUmbrellaId();
        await this.setState({umbrellaId: umbrellaId});
        this.fetchOrgs();
    }

    componentWillUnmount() {
        // detach listeners
        db.ref('accounts').orderByChild('umbrella').equalTo(this.state.umbrellaId).off();
        db.ref('donating_agencies').orderByChild('umbrella').equalTo(this.state.umbrellaId).off();
    }

    getUmbrellaId() {
        const { account }= this.props;
        if (account.accountType === AccountType.UMBRELLA) {
            return account.uid;     
        }
        return account.umbrella;
    }

    fetchOrgs() {
        switch (this.props.account.accountType) {
        case AccountType.DONATING_AGENCY_MEMBER:
            this.fetchRaAndDg([AccountType.DELIVERER_GROUP, AccountType.RECEIVING_AGENCY]); 
            break;
        case AccountType.RECEIVING_AGENCY:
            this.fetchRaAndDg([AccountType.DELIVERER_GROUP]); 
            this.fetchDAM();
            break;
        case AccountType.DELIVERER_GROUP:
            this.fetchRaAndDg([AccountType.RECEIVING_AGENCY]);
            this.fetchDAM();
            break;
        case AccountType.UMBRELLA:
            this.fetchRaAndDg([AccountType.RECEIVING_AGENCY, AccountType.DELIVERER_GROUP]);   
            this.fetchDAM();
            break;
        default:
            break;
        }
    }

    fetchRaAndDg(orgTypes) { // fetch receiving agencies or delivery groups
        // keeps listening for real-time database change 
        db.ref('accounts').orderByChild('umbrella').equalTo(this.state.umbrellaId).on('value', (snapshot) => { 
            let accountObjects = snapshot.val();       
            let raList = [];
            let dgList = [];

            // loop through all AccountObjects
            for (let key in accountObjects) {
                let accountItem = accountObjects[key];
                if (accountObjects.hasOwnProperty(key)  // filter out prototype props
                    && orgTypes.includes(accountItem.accountType) && accountItem.isVerified) { // if accountType is in orgTypes 
                    let org = this.aggrRAorDGOrgObj(accountItem);
                    if (accountItem.accountType === AccountType.RECEIVING_AGENCY) {
                        raList.push(org);
                    }
                    else { // AccountType.DELIVERER_GROUP
                        dgList.push(org);     
                    }

                }
            }
            this.setState({raList: raList, dgList: dgList});
        });
    }

    aggrRAorDGOrgObj(accountItem) {
        let personnel = accountItem.primaryContact;

        let org = {
            organization: accountItem.name,
            logo: logoURL,
            accountType: accountItem.accountType,
            contactName: personnel.name,
            contactTitle: personnel.position,
            contactNumber: personnel.phone,
            contactEmail: personnel.email,
        };

        this.aggrAddress(org, accountItem.address);
        
        if (accountItem.accountType === AccountType.RECEIVING_AGENCY) {
            org.availability = this.aggrAvailability(accountItem.availabilities);
        }
        return org;
    }

    aggrAddress(org, addrObj) {
        org.address1 = addrObj.street1;
        org.address2 = `${addrObj.city}, ${addrObj.state} ${addrObj.zipcode}`;

        // append street2 and officeNumber if exist
        org.address1 += addrObj.street2 ? ` ${addrObj.street2}` : '';
        org.address1 += addrObj.officeNumber ? ` ${addrObj.officeNumber}` : '';
    }

    aggrAvailability(obj) {
        let availabilityList = [];
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) { // filter out prototype props
                let item = obj[key];
                availabilityList.push(`${DaysOfWeek[key]}: 
                ${moment(item.startTimestamp).format(StringFormat.TIME)} - ${moment(item.endTimestamp).format(StringFormat.TIME)}`);
            }
        }
        return availabilityList;
    }

    fetchDAM() { // fetch donating agencies, with members
        // keeps listening for real-time database change 
        db.ref('donating_agencies').orderByChild('umbrella').equalTo(this.state.umbrellaId).on('value', async (snapshot) => {
            let daObjects = snapshot.val();            
            let daList = [];        // [da1. da2, da3, ...]
            let daMemberKey = [];   // [ [da1Member1Key, da1Member2Key, ...], [da2Member1Key, ...], ... ]
            let daPromiseList = []; // [ [da1Member1Promise, da1Member2Promise, ...], [da1Member1Promise, ...] ... ]

            // loop through all daObjects
            for (let key in daObjects) {
                if (daObjects.hasOwnProperty(key)) { // filter out prototype props
                    let daItem = daObjects[key];
                    daList.push(daItem);
                    let members = daItem.members;
                    daMemberKey.push(members);
    
                    // for every da member, create promise to fetch data,
                    // will be resolved when get this member data
                    let daMemberPromiseList = members.map((damId) =>
                        new Promise( 
                            async (resolve, reject) => {
                                let snapshot = await db.ref(`accounts/${damId}`).once('value');
                                resolve(snapshot.val());
                            }
                        )
                    );
    
                    // a parent promise that contains all member-promises of that da,
                    // will be resolved when get all members' data
                    let daPromise = new Promise( 
                        async (resolve, reject) => {
                            let daMembers = await Promise.all(daMemberPromiseList);
                            resolve(daMembers);
                        }
                    );
                    daPromiseList.push(daPromise);
                }
            }

            // [ [da1Member1Data, da1Member2Data, ...], [da2Member1Data, ...], ... ]
            let daMemberList = await Promise.all(daPromiseList); // all da-parent-promises of this umbrella 
            let aggredDaList = this.aggrDaList(daList, daMemberList, daMemberKey);
            this.setState({daList: aggredDaList});
        });
    }

    aggrDaList(daList, daMembers, daMemberKey) {
        let result = [];
        for (let i = 0; i < daList.length; i++) { // loop through all DAs
            let daItem = daList[i];

            let org = {
                organization: daItem.name,
                logo: logoURL,
                accountType: AccountType.DONATING_AGENCY,
                members: []
            };
            this.aggrAddress(org, daItem.address);
            
            for (let j = 0; j < daMembers[i].length; j++) { // loop through all members of that DA
                let member = daMembers[i][j];
                let memberKey = daMemberKey[i][j];
                let { name, position, phone, email } = member;

                if (daItem.primaryContact === memberKey) { // if this member is primaryContact
                    org.contactName = name;
                    org.contactTitle = position;
                    org.contactNumber = phone;
                    org.contactEmail = email;
                } else {
                    let memberObj = {
                        contactName: name,
                        contactTitle: position,
                        contactNumber: phone,
                        contactEmail: email
                    };
                    org.members.push(memberObj);
                }
            }
            result.push(org);
        }
        return result;
    }

    getViews() {
        let list = [this.state.daList, this.state.raList, this.state.dgList];
        list = list.reduce((prev, curr) => curr.concat(prev));  // concat all lists
        let listView = list.map((orgInfo) => {  // get populated views 
            orgInfo.key = orgInfo.organization; // add key for iterable React Component
            return React.cloneElement(<DirectoryCard />, orgInfo);
        });
        return listView;
    }

    render() {
        let orgListView = this.getViews();
        return (
            <div className="directoryPage">
                {/* TODO: For now, I'll keep the filter component separate
                            but I think I will move it to the Directory Page so that it will be easier
                            to grab the filter query and use it to display the directory cards below */}
                {/* <DirectoryFilter /> */}
                <div style={{'height': '110px'}}></div> {/* add DirectoryFilter placeholder /> */}
                { orgListView }                 
            </div>
        );
    }
}

export default DirectoryPage;