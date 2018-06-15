const request = require("request");
const cheerio = require('cheerio');
const calc_buildnum = require("./actions").calc_buildnum;
const pte_hardcode = require('./hardcoded.js').pte_hardcode
const ote_hardcode = require('./hardcoded.js').ote_hardcode
const lte_hardcode = require('./hardcoded.js').lte_hardcode
// base should be earliest date and buildnum so we can use it for calculating all other buildnums

// // HARDCODE BASE
// const pte_base = {'2018-06-13':1}
// const svt_base = {'2018-06-13':1}

// FETCH BASE
const pte_base = {'2018-06-13':3}
const svt_base = {'2018-06-13':46}

const fetchBuild = (req, res) => {
	let tool = req.params.test
	urls = {
		'pte': 'https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-pte-x86_64',
		'ote': 'https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-svt-x86_64',
		'lte': 'https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-svt-x86_64'
	}
	url = urls[tool]
	request(url, {json:false}, (err, response, body) => {
		if (err) {return console.log(err);}

		date2build = {}

		const $ = cheerio.load(body)
		$('#buildHistory').find('.build-row').each(function(i, elem) {
			build_n_date = $(this).text().split(" ").slice(0,3).join("").replace("#","")
			// Looks for capital letter to indicate the beginning of the date portion of the string
			let match = /[A-Z]/.exec(build_n_date)
			if (match) {
				// Index to split build_n_date on
				split_idx = match.index
				build = build_n_date.slice(0,split_idx)
				date = new Date(build_n_date.slice(split_idx))

				yr = date.getFullYear()
				mo = String(date.getMonth()+1).length == 1 ? "0" + String(date.getMonth()+1) : date.getMonth()+1
				d = String(date.getDate()).length == 1 ? "0" + String(date.getDate()) : date.getDate()
				date = [yr, mo , d].join("-")

				if (!date2build[date] || (date2build[date] && date2build[date] < build)) {
					date2build[date] = build
				}
			}
		})
		res.send(date2build)
	})
}

const getBuild = (req, res) => {
	// Calculate given date's associated build number for given test
	console.log(fetchBuild('pte'))
	console.log(fetchBuild('ote'))
	console.log(fetchBuild('lte'))
	let test = req.params.test
	let buildnum = test == 'pte' ? calc_buildnum(req.params.date, pte_base) : calc_buildnum(req.params.date, svt_base)
	res.send({"build":buildnum})
}

const getPTE = (req,res) => {
	// Fetches PTE metrics based on date and fab number.

	const fab = req.params.fab
	const buildnum = req.params.build

	// //// USING HARDCODE
	// if (pte_hardcode[buildnum] == null) {
	// 	res.send({"success":false})
	// 	return
	// }
	// res.send({'success':true, 'invoke':pte_hardcode[buildnum]['invoke'][fab], 'query':pte_hardcode[buildnum]['query'][fab]})
	// return
	// ////


	const url_pte= `https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-pte-x86_64/${buildnum}/artifact/gopath/src/github.com/hyperledger/fabric-test/tools/PTE/CITest/scenarios/result_${fab}.log`
	request(url_pte, { json: false }, (err, response, body) => {
	  if (err) { res.send({"success":false}); return console.log(err);}

	  // Filters out unnecessary whitespaces
	  bodyarray = body.split("\n").filter(function(str) {
	    return /[\S]/.test(str);
	  });

	  // Split the log file into 2 sections -- invoke test results and query test results
	  let invoke_result = null
	  let query_result = null
	  for (i = 0; i < bodyarray.length; i++) {
	  	if (bodyarray[i].includes("Test Summary")) {
	  		invoke_result = bodyarray.slice(0,i)
	  		query_result = bodyarray.slice(i)
	  		break
	  	}
	  }
	  if (invoke_result == null || query_result == null) {
	 	console.log("ERROR DETAILS:", fab, url_pte)
	  	console.log("Unable to split invoke and query results in log")
	  	res.send({"success":false})
	  	return
	  }

	  // Pull data from invoke summary using first peer by looking for first instance of line that begins with "Peer:"
	  let invoke_summary = ""
	  for (k = 0; k < invoke_result.length; k++) {
	  	if (invoke_result[k].includes("Peer:")) {
	  		invoke_summary = invoke_result.slice(k,k+4).join("")
	  		break
	  	}
	  }
	  if (invoke_summary == "") {
	  	console.log("Unable to extract invoke summary")
	  	res.send({"success":false})
	  	return
	  }

	  // Pull relevant date from line
	  invoke_summary_array = invoke_summary.split(": ").filter(function(str) {
	  	return /[\S]/.test(str);
	  })
	  invoke_data = {}
	  for (l = 0; l < invoke_summary_array.length; l++) {
	  	if (invoke_summary_array[l].includes("total time")) {
	  		invoke_data["totaltime"] = invoke_summary_array[l+1].split(" ")[0]
	  	}
	  	else if (invoke_summary_array[l].includes("tx Num")) {
	  		invoke_data["txnum"] = invoke_summary_array[l+1].split(",")[0]
	  	}
	  	else if (invoke_summary_array[l].includes("TPS")) {
	  		invoke_data["tps"] = invoke_summary_array[l+1]
	  	}
	  }

	  // Pull data from query summary by looking for first instance of line that begins with "Aggregate Test Summary"
	  query_summaries = []
	  for (let summaryline of query_result) {
	  	if (summaryline.includes("Aggregate Test Summary")) {
	  		query_summaries.push(summaryline)
	  	}
	  }
	  if (!query_summaries) {
	  	console.log("Unable to extract query summaries")
	  	res.send({"success":false})
	  	return
	  }
	  // Pull relevant data from line
	  query_data = {"totaltime":0, "txnum":0, "tps":0}
	  for (let summary of query_summaries) {
	  	splitsummary = summary.split(",")
	  	split_txnum = splitsummary[0].split(" ")
	  	split_time = splitsummary[1].split(" ms")[0].split(" ")
	  	split_tps = splitsummary[2].split(" ")
	  	query_data["txnum"] += parseFloat(split_txnum[split_txnum.length-1])
	  	query_data["totaltime"] = Math.max(query_data["totaltime"], parseFloat(split_time[split_time.length-1]))
	  	query_data["tps"] += parseFloat(split_tps[split_tps.length-1])
	  }

	  invoke_data["fab"] = fab

	  res.send({"success":true, "invoke":invoke_data, "query":query_data})
	});
}

const getOTE = (req,res) => {
	// Fetches OTE metrics based on date and fab number.
	
	const fab = req.params.fab
	const buildnum = req.params.build

	// //// USING HARDCODE
	// if (ote_hardcode[buildnum] == null) {
	// 	res.send({"success":false})
	// 	return
	// }
	// res.send(ote_hardcode[buildnum][fab])
	// return
	// ////

	const url_ote = `https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-svt-x86_64/${buildnum}/artifact/gopath/src/github.com/hyperledger/fabric-test/regression/daily/ote_logs/ote_${fab}.log`
	request(url_ote, { json: false }, (err, response, body) => {
	  if (err) { res.send({"success":false}); return console.log(err);}
	  // Page must contain a line containing "RESULT=" since that's where the relevant data is
	  if (body.split("RESULT=")[1] == null) {
	  	res.send({"success":false})
	  	return;
	  }
	  results = body.split("RESULT=")[1].split("\n")[0]
	  status = results.split(" ")[0].replace(":","")
	  for (i = 2; i < results.length; i++) {
	  	results[i] = results[i].split("=")[1]
	  }
	  let 	txreq = results.split("Req=")[1].split(" ")[0]
	  		ack = results.split("ACK=")[1].split(" ")[0]
	  		nack = results.split("NACK=")[1].split(" ")[0]
	  		delivblk = results.split("DelivBlk=")[1].split("[")[1].split(" ")[0].replace("]","")
	  		delivtx = results.split("DelivTX=")[1].split("[")[1].split(" ")[0].replace("]","")
	  		numch = results.split("Channels=")[1].split(" ")[0]
	  		batchsize = results.split("batchSize=")[1].split(" ")[0]
	  		tps = results.split("TPS=")[1]

	  result_data = {"success":true, "fab":fab, "status":status, "txreq":txreq, "ack":ack, "nack":nack, "delivblk":delivblk, "delivtx":delivtx,
					"numch":numch, "batchsize":batchsize, "tps":tps}
	  res.send(result_data)
	})
}

const getLTE = (req,res) => {
	// Fetches LTE metrics based on date.

	const buildnum = req.params.build
	const url_lte = `https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-svt-x86_64/${buildnum}/artifact/gopath/src/github.com/hyperledger/fabric-test/tools/LTE/TestResults/experiments/BenchmarkReadWriteTxs/results.csv`
	// fabs taken from script at https://github.com/hyperledger/fabric-test/blob/master/regression/daily/ledger_lte.py
	const fabs = ['FAB-3790','FAB-3795','FAB-3798','FAB-3799','FAB-3801','FAB-3802','FAB-3800','FAB-3803','FAB-3870','FAB-3871','FAB-3872','FAB-3873','FAB-3874','FAB-3875','FAB-3876','FAB-3877']

	//// USING HARDCODE
	// let data = {}
	// if (lte_hardcode[buildnum] == null) {
	// 	res.send({"success":false})
	// 	return
	// }
	// for (let fab of fabs) {
	// 	data[fab] = lte_hardcode[buildnum][fab]
	// }
	// res.send({'success':true, 'data':data})
	// return
	////


	// check if build log exists
	request(`https://jenkins.hyperledger.org/view/fabric-test/job/fabric-test-svt-x86_64/${buildnum}/artifact/gopath/src/github.com/hyperledger/fabric-test/tools/LTE/TestResults/experiments`, { json: false }, (err, response, body) => {
		// Check if log file exists
		if (body.includes("404 Not Found")) {
			res.send({"success":false})
		}
		else {
			request(url_lte, { json: false }, (err, response, body) => {
				if (err) {res.send({"success":false}); return console.log(err);}
				// Removes first line because it's unnecessary
				body = response.body.split("\n").slice(1).join("\n").split("\n\n")
				columns= body[0].split("\n")[1].split(",")
				time_idx = columns.indexOf(" Time_Spent(s)")
				txnum_idx = columns.indexOf(" NumTotalTx")
				data = {}
				for (let fab of fabs) {
					data[fab] = {};
				}
				for (i = 0; i < fabs.length; i++) {
					if (body[i] == null || response.body.includes("404 Not Found")) {
						data[fabs[i]]['status'] = 'FAILED'
						continue
					}
					else {
						data[fabs[i]]['status'] = 'PASSED'
					}
					line1 = body[i].split("\n")[2].split(",")
					tps = line1[txnum_idx] / line1[time_idx]
					data[fabs[i]]['tps'] = tps
					data[fabs[i]]['txnum'] = line1[txnum_idx]
					data[fabs[i]]['time'] = line1[time_idx]
				}
				res.send({'success':true,'data':data})
			})
		}
	})
}

module.exports = (app) => {
	app.get("/pte/:fab/:build", getPTE)
	app.get("/ote/:fab/:build", getOTE)
	app.get("/lte/:build", getLTE)
	app.get("/build/:test", fetchBuild)
}
