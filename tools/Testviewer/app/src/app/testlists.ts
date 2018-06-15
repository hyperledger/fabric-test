// Lists FAB#'s of possible tests to look at. The FAB#'s must be present in the daily log files for
// PTE and OTE. LTE fab #'s are available on https://github.com/hyperledger/fabric-test/blob/master/regression/daily/ledger_lte.py

// available is the list of available tests to choose from
// selected is the list of tests that are preselected among the available tests

let testlists = {
	'pte':
		{
			'available':['FAB-3807-4i','FAB-3808-2i','FAB-3832-4i','FAB-3833-2i'],
			'selected':['FAB-3807-4i','FAB-3808-2i','FAB-3832-4i','FAB-3833-2i']
		},
	'ote':
		{
			'available':['FAB-6996','FAB-7036','FAB-7038','FAB-7060','FAB-7061','FAB-7080','FAB-7081'],
			'selected':['FAB-6996','FAB-7036','FAB-7038','FAB-7060','FAB-7061','FAB-7080','FAB-7081']
		},
	'lte':
		{
			'available':['FAB-3790','FAB-3795','FAB-3798','FAB-3799','FAB-3801','FAB-3802','FAB-3800','FAB-3803','FAB-3870','FAB-3871','FAB-3872','FAB-3873','FAB-3874','FAB-3875','FAB-3876','FAB-3877'],
			'selected':['FAB-3790','FAB-3795','FAB-3798','FAB-3799','FAB-3801','FAB-3802']
		}
}

export { testlists }