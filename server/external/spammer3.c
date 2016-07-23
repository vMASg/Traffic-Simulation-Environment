#include <fcntl.h>
// #include <stdio.h>
#include <windows.h>

int main() {
	while (1){
		Sleep(500);
		write(2, "[WKUP]\n", 7);
	}
}