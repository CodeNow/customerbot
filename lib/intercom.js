import {
    Client
}
from 'intercom-client'
import async from 'async'

class Intercom extends Client {

    constructor(config) {
        super(config.connection)
        this.allowed_tags = config.allowed_tags
        this.feedback = config.feedback

        // this.notes.createForCompany = (params, company, f) => {
        //     return this.client.post(`/a/apps/${config.connection.appId}/companies/${company.id}/notes`, params, f);
        // }
    }

    getTagCount(tag_id, cb) {
        this.companies.listBy({
            tag_id: tag_id
        }, (err, res) => {
            if (err) {
                console.log('Error: ', err.error, '\nTagID: ', tag_id)
                cb(-1)
            } else {
                cb(res.body.total_count)
            }
        })
    }

    generateTagsTable(cb) {
        let r = {}

        this.tags.list((err, list) => {
            async.forEachSeries(list.body.tags, (e, icb) => {
                if (e.name.indexOf('SAN-') >= 0) {
                    this.getTagCount(e.id, (count) => {
                        r[e.name] = count
                        icb()
                    })
                } else {
                    icb()
                }
            }, (err) => {
                if (err)
                    cb(err, null)

                console.log('done')
                cb(null, r)
            })
        })
    }

    tagCompany(tag, company, callback) {
        this.tags.tag({
            name: tag,
            companies: [{
                id: company.id
            }]
        }, (err) => { callback(err) })
    }

    getCompanyFromName(company_name, cb) {
        let self = this

        let companyList = []

        let recursiveFetchCompaines = function(err, results) {
            if (!results || results.body.pages.page > results.body.pages.total_pages) {

                let found = false

                companyList.forEach((company) => {
                    if (company.name == company_name) {
                        found = true
                        cb(company)
                    }
                })
                if (found == false) {
                    cb(null)
                }


            } else {
                results.body.companies.forEach((company) => {
                    companyList.push(company)
                })

                self.nextPage(results.body.pages, recursiveFetchCompaines)
            }
        }

        this.companies.list((err, results) => {
            if (err)
                console.log(err)

            results.body.companies.forEach((company) => {
                companyList.push(company)
            })

            self.nextPage(results.body.pages, recursiveFetchCompaines)
        })
    }

    addNote(message, companyName, cb) {
        this.users.find({
            user_id: 'navi-' + companyName
        }, (err, res) => {
            if (err) {
                // navi user does not exist; skipping notes.
                cb('navi user does not exist, skipping')
            } else {
                // Create a note
                let note = {
                    admin_id: 22382,
                    body: message,
                    id: res.body.id
                }

                this.notes.create(note, (err2) => {
                    if (err2) {
                        cb('ran into an error adding the note' + JSON.stringify(err2))
                    } else {
                        cb('successfully added note')
                    }
                })
            }
        })
    }

    countUsers(company, cb) {
        let ctr = 0

        this.companies.listUsers({
            id: company.id
        }, (err, res) => {
            let users = res.body.users

            if (users) {
                async.forEachSeries(users, (user, icb) => {
                    if (!user.user_id)
                        ctr++
                    else
                            console.log('skipping user', user.user_id)

                    icb()
                }, () => {
                    console.log('actually calling back with', ctr)
                    cb(ctr)
                })

            } else {
                console.log('skipping ... ' + company.company_id + ' has no users')
            }
        })
    }

    processList(companyList, cb) {
        let rez = {}
        let total = 0

        async.forEachSeries(companyList, (company, icb) => {
            console.log('Counting users for: ', company.company_id)
            this.countUsers(company, (count) => {
                rez[company.company_id] = count
                total += count
                icb()
            })

        }, () => {
            console.log('Count: ', total)
            cb(total)
        })
    }

    getSegmentCount(segment_id, callback) {
        let companyList = []

        this.companies.listBy({
            segment_id: segment_id
        }, (err, results) => {
            var self = this

            function recursiveFetchCompaines(err, results) {
                if (err)
                    console.log(err)

                if (!results || results.body.pages.page > results.body.pages.total_pages) {
                    console.log('done fetching companies....')
                    self.processList(companyList, (count) => {
                        callback(count)
                    })

                } else {
                    results.body.companies.forEach((company) => {
                        companyList.push(company)
                    })

                    self.nextPage(results.body.pages, recursiveFetchCompaines)
                }
            }


            results.body.companies.forEach((company) => {
                companyList.push(company)
            })

            this.nextPage(results.body.pages, recursiveFetchCompaines)
        })
    }


    gatherFunnelStatistics(message, sendMessage) {
        this.feedback.map(item => {
            this.getSegmentCount(item.intercom_id, count => {
                sendMessage(message.channel, item.desc + count)
            })
        })
    }

}

export
default Intercom